import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { BoardState, KanbanAction } from '../types';
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

            if (action.type === 'SET_STATE') {
                return { past: [], present: action.payload, future: [] };
            }

            const newPresent = kanbanReducer(present, action);
            if (newPresent === present) return h;

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
                console.log('Fetching boards...');
                const response = await api.get('/boards');
                let board;

                if (response.data.length === 0) {
                    console.log('No boards found, creating default...');
                    const newBoardRes = await api.post('/boards', { title: 'Personal Board' });
                    board = newBoardRes.data;
                    
                    const columnTitles = ['To Do', 'In Progress', 'Done'];
                    for (let i = 0; i < columnTitles.length; i++) {
                        await api.post('/columns', { title: columnTitles[i], boardId: board.id, order: i });
                    }
                    
                    const refreshed = await api.get(`/boards/${board.id}`);
                    board = refreshed.data;
                } else {
                    board = response.data[0];
                    console.log('Board found:', board.id);
                }

                setActiveBoardId(board.id);
                const mappedState = mapApiBoardToState(board);
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

    // Async Synchronizer
    const wrappedDispatch = useCallback(async (action: KanbanAction) => {
        // 1. Optimistic Update
        setHistory(action);

        if (!activeBoardId || !isHydrated) {
            console.warn('Action skipped sync: Board not hydrated or ID missing');
            return;
        }

        // 2. Persistence
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
                    
                    // Replace temp ID with real ID in the state
                    const realId = response.data.id;
                    const updatedTasks = { ...stateRef.current.tasks, [realId]: { ...task, id: realId } };
                    delete updatedTasks[task.id];

                    const updatedColumns = { ...stateRef.current.columns };
                    updatedColumns[columnId] = {
                        ...updatedColumns[columnId],
                        taskIds: updatedColumns[columnId].taskIds.map(id => id === task.id ? realId : id)
                    };

                    setHistory({
                        type: 'SET_STATE',
                        payload: {
                            ...stateRef.current,
                            tasks: updatedTasks,
                            columns: updatedColumns
                        }
                    });
                    break;
                }
                case 'UPDATE_TASK': {
                    const { task } = action.payload;
                    await api.patch(`/tasks/${task.id}`, {
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                    });
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
