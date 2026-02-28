import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { BoardState, KanbanAction, Task, Checklist } from '../types';
import { kanbanReducer, initialState } from './kanbanReducer';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { mapApiBoardToState } from '../lib/mappers';

interface KanbanContextType {
    state: BoardState;
    dispatch: (action: KanbanAction) => Promise<void>;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isSyncing: boolean;
    activeBoardId: string | null;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [isHydrated, setIsHydrated] = useState(false);
    
    const [history, setHistory] = useReducer(
        (h: { past: BoardState[]; present: BoardState; future: BoardState[] }, action: KanbanAction) => {
            const { past, present, future } = h;

            if (action.type === 'INTERNAL_UNDO') {
                if (past.length === 0) return h;
                const previous = past[past.length - 1];
                return { past: past.slice(0, past.length - 1), present: previous, future: [present, ...future] };
            }

            if (action.type === 'INTERNAL_REDO') {
                if (future.length === 0) return h;
                const next = future[0];
                return { past: [...past, present], present: next, future: future.slice(1) };
            }

            const newPresent = kanbanReducer(present, action);
            if (newPresent === present) return h;

            if (action.type === 'SET_STATE') {
                return { past: [], present: newPresent, future: [] };
            }

            return {
                past: [...past, present],
                present: newPresent,
                future: [],
            };
        },
        { past: [], present: initialState, future: [] }
    );

    // Latest state ref for async dispatches
    const stateRef = useRef(history.present);
    useEffect(() => {
        stateRef.current = history.present;
    }, [history.present]);

    // Initial Hydration
    useEffect(() => {
        if (!isAuthenticated) return;

        const loadBoardData = async () => {
            setIsSyncing(true);
            try {
                const response = await api.get('/boards');
                let board;

                if (response.data.length === 0) {
                    const newBoardRes = await api.post('/boards', { title: 'Personal Board' });
                    board = newBoardRes.data;
                    
                    const columns = [
                        { title: 'Backlog', order: 0 },
                        { title: 'To Do', order: 1 },
                        { title: 'In Progress', order: 2 },
                        { title: 'Review', order: 3 },
                        { title: 'Done', order: 4 }
                    ];
                    for (let i = 0; i < columns.length; i++) {
                        await api.post('/columns', { title: columns[i].title, boardId: board.id, order: i });
                    }
                    
                    const refreshed = await api.get(`/boards/${board.id}`);
                    board = refreshed.data;
                } else {
                    board = response.data[0];
                }

                setActiveBoardId(board.id);
                const mappedState = mapApiBoardToState(board);
                
                if (mappedState.columns['inprogress']) mappedState.columns['inprogress'].wipLimit = 3;
                if (mappedState.columns['review']) mappedState.columns['review'].wipLimit = 2;
                if (mappedState.columns['todo']) mappedState.columns['todo'].wipLimit = 10;

                setHistory({ type: 'SET_STATE', payload: mappedState });
                setIsHydrated(true);
            } catch (err) {
                console.error('Initial load error:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        loadBoardData();
    }, [isAuthenticated]);

    const syncChecklistsForTask = async (taskId: string, checklists: Checklist[]) => {
        for (const cl of checklists) {
            let checklistId = cl.id;
            // 1. Create or Update Checklist
            if (cl.id.length > 36) { // Client-side UUID is usually 36, but let's check for "temp" or length
                const res = await api.post(`/tasks/${taskId}/checklists`, { title: cl.title });
                checklistId = res.data.id;
            } else {
                await api.patch(`/checklists/${cl.id}`, { title: cl.title });
            }

            // 2. Sync Items
            for (const item of cl.items) {
                if (item.id.length > 36) {
                    await api.post('/subtasks', {
                        content: item.title,
                        checklistId: checklistId,
                    });
                } else {
                    await api.patch(`/subtasks/${item.id}`, {
                        content: item.title,
                        completed: item.isCompleted,
                    });
                }
            }
        }
    };

    // Async Synchronizer
    const wrappedDispatch = useCallback(async (action: KanbanAction) => {
        setHistory(action);

        if (!activeBoardId || !isHydrated) return;

        try {
            switch (action.type) {
                case 'ADD_TASK': {
                    const { columnId, task } = action.payload;
                    const response = await api.post('/tasks', {
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                        columnId: columnId,
                        order: stateRef.current.columns[columnId]?.taskIds.length || 0,
                    });
                    
                    const realId = response.data.id;
                    
                    // Sync Checklists for new task
                    if (task.checklists?.length > 0) {
                        await syncChecklistsForTask(realId, task.checklists);
                    }

                    // Update local state with real IDs from DB
                    const refreshedBoard = await api.get(`/boards/${activeBoardId}`);
                    setHistory({ type: 'SET_STATE', payload: mapApiBoardToState(refreshedBoard.data) });
                    break;
                }
                case 'UPDATE_TASK': {
                    const { task } = action.payload;
                    await api.patch(`/tasks/${task.id}`, {
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                    });

                    // Sync Checklists
                    if (task.checklists?.length > 0) {
                        await syncChecklistsForTask(task.id, task.checklists);
                    }
                    break;
                }
                case 'DELETE_TASK': {
                    await api.delete(`/tasks/${action.payload.taskId}`);
                    break;
                }
                case 'MOVE_TASK': {
                    const { taskId, destinationColId, destinationIndex } = action.payload;
                    await api.patch(`/tasks/${taskId}`, {
                        columnId: destinationColId,
                        order: destinationIndex,
                    });
                    break;
                }
                case 'ADD_COLUMN': {
                    const { column } = action.payload;
                    const response = await api.post('/columns', {
                        title: column.title,
                        boardId: activeBoardId,
                        order: stateRef.current.columnOrder.length,
                    });

                    const realId = response.data.id;
                    const updatedColumns = { ...stateRef.current.columns, [realId]: { ...column, id: realId } };
                    delete updatedColumns[column.id];

                    const updatedColumnOrder = stateRef.current.columnOrder.map(id => 
                        id === column.id ? realId : id
                    );

                    setHistory({
                        type: 'SET_STATE',
                        payload: {
                            ...stateRef.current,
                            columns: updatedColumns,
                            columnOrder: updatedColumnOrder
                        }
                    });
                    break;
                }
                case 'DELETE_COLUMN': {
                    await api.delete(`/columns/${action.payload.columnId}`);
                    break;
                }
                case 'REORDER_COLUMN': {
                    await api.post(`/boards/${activeBoardId}/columns/reorder`, {
                        columnIds: action.payload.columnOrder,
                    });
                    break;
                }
                case 'ADD_CHECKLIST': {
                    const { taskId, checklist } = action.payload;
                    const response = await api.post(`/tasks/${taskId}/checklists`, {
                        title: checklist.title,
                    });
                    
                    const realId = response.data.id;
                    const task = stateRef.current.tasks[taskId];
                    const updatedChecklists = task.checklists.map(cl => 
                        cl.id === checklist.id ? { ...cl, id: realId } : cl
                    );

                    setHistory({
                        type: 'UPDATE_TASK',
                        payload: { task: { ...task, checklists: updatedChecklists } }
                    });
                    break;
                }
                case 'DELETE_CHECKLIST': {
                    await api.delete(`/checklists/${action.payload.checklistId}`);
                    break;
                }
                case 'UPDATE_CHECKLIST': {
                    const { checklist, taskId } = action.payload;
                    await api.patch(`/checklists/${checklist.id}`, {
                        title: checklist.title,
                    });
                    
                    // Sync items
                    const task = stateRef.current.tasks[taskId];
                    const localChecklist = task.checklists.find(cl => cl.id === checklist.id);
                    if (localChecklist) {
                        for (const item of localChecklist.items) {
                            if (item.id.length > 36) {
                                await api.post('/subtasks', {
                                    content: item.title,
                                    checklistId: checklist.id,
                                });
                            } else {
                                await api.patch(`/subtasks/${item.id}`, {
                                    content: item.title,
                                    completed: item.isCompleted,
                                });
                            }
                        }
                    }
                    break;
                }
                case 'UPDATE_COLUMN': {
                    const { column } = action.payload;
                    await api.patch(`/columns/${column.id}`, {
                        title: column.title,
                    });
                    break;
                }
                case 'SET_VIEW_MODE': {
                    localStorage.setItem('flowforce_view_mode', action.payload);
                    break;
                }
            }
        } catch (err) {
            console.error('Persistence failure:', err);
        }
    }, [activeBoardId, isHydrated]);

    const undo = useCallback(() => setHistory({ type: 'INTERNAL_UNDO' }), []);
    const redo = useCallback(() => setHistory({ type: 'INTERNAL_REDO' }), []);

    return (
        <KanbanContext.Provider
            value={{
                state: history.present,
                dispatch: wrappedDispatch,
                undo,
                redo,
                canUndo: history.past.length > 0,
                canRedo: history.future.length > 0,
                isSyncing,
                activeBoardId,
            }}
        >
            {children}
        </KanbanContext.Provider>
    );
};

export const useKanban = () => {
    const context = useContext(KanbanContext);
    if (!context) {
        throw new Error('useKanban must be used within a KanbanProvider');
    }
    return context;
};
