import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { BoardState, KanbanAction, Checklist } from '../types';
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
    isHydrated: boolean;
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

    // Helper to build board URL with optional sprintId filter
    const getBoardUrl = (boardId: string, sprintId?: string | null) => {
        const url = `/boards/${boardId}`;
        if (sprintId) {
            return `${url}?sprintId=${sprintId}`;
        }
        return url;
    };

    // Helper to refresh board state after API operations
    const refreshBoardState = useCallback(async (boardId: string, sprintId: string | null) => {
        const refreshedBoard = await api.get(getBoardUrl(boardId, sprintId || undefined));
        const newState = mapApiBoardToState(refreshedBoard.data);
        return {
            ...newState,
            sprints: stateRef.current.sprints,
            activeSprintId: sprintId,
        };
    }, []);

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

                    // Note: CreateBoardUseCase already adds default columns: To Do, In Progress, Done
                    // But we might want the specific ones from the frontend template
                    // For now, let's just use what's returned
                    const refreshed = await api.get(`/boards/${board.id}`);
                    board = refreshed.data;
                } else {
                    board = response.data[0];
                }

                setActiveBoardId(board.id);
                const mappedState = mapApiBoardToState(board);

                // Set default WIP limits if they exist in state
                if (mappedState.columns['inprogress']) mappedState.columns['inprogress'].wipLimit = 3;
                if (mappedState.columns['review']) mappedState.columns['review'].wipLimit = 2;
                if (mappedState.columns['todo']) mappedState.columns['todo'].wipLimit = 10;

                // Load sprints
                let activeSprintId: string | null = null;
                try {
                    const sprintsResponse = await api.get(`/sprints/boards/${board.id}`);
                    mappedState.sprints = sprintsResponse.data || [];

                    // Restore active sprint from localStorage
                    const savedSprintId = localStorage.getItem('flowforce_active_sprint_id');
                    if (savedSprintId) {
                        const sprintExists = mappedState.sprints.some((s: any) => s.id === savedSprintId);
                        activeSprintId = sprintExists ? savedSprintId : null;
                    } else {
                        // Default to active sprint if one exists
                        const activeSprint = mappedState.sprints.find((s: any) => s.status === 'ACTIVE');
                        activeSprintId = activeSprint?.id || null;
                    }
                } catch (sprintErr) {
                    console.warn('Could not load sprints:', sprintErr);
                    mappedState.sprints = [];
                    activeSprintId = null;
                }

                // If there's an active sprint, re-fetch board with sprint filter
                if (activeSprintId) {
                    const newState = {
                        ...mapApiBoardToState((await api.get(getBoardUrl(board.id, activeSprintId))).data),
                        sprints: mappedState.sprints,
                        activeSprintId: activeSprintId,
                    };
                    setHistory({ type: 'SET_STATE', payload: newState });
                } else {
                    mappedState.activeSprintId = activeSprintId;
                    // Always refresh to get full board data with tasks
                    const refreshedState = await refreshBoardState(board.id, null);
                    setHistory({ type: 'SET_STATE', payload: refreshedState });
                }
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
            // UUIDs contain hyphens and are frontend-generated; DB IDs (nanoid) have no hyphens
            if (cl.id.includes('-')) {
                const res = await api.post(`/tasks/${taskId}/checklists`, { title: cl.title, taskId });
                checklistId = res.data.id;

                // 2a. For NEW checklists, create all items (they weren't dispatched via ADD_SUBTASK)
                for (const item of cl.items) {
                    await api.post('/subtasks', {
                        content: item.title,
                        checklistId: checklistId,
                        completed: item.isCompleted,
                        priority: item.priority?.toUpperCase(),
                    });
                }
            } else {
                await api.patch(`/checklists/${cl.id}`, { title: cl.title });

                // 2b. For existing checklists, skip items with hyphens (already handled by ADD_SUBTASK)
                // They will be refreshed with real DB IDs after board state refresh
                for (const item of cl.items) {
                    if (item.id.includes('-')) {
                        continue;
                    }
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
                    // Use the sprintId from the task payload if provided, otherwise use active sprint
                    const sprintId = task.sprintId !== undefined ? task.sprintId : stateRef.current.activeSprintId;
                    const response = await api.post('/tasks', {
                        id: task.id, // Pass the generated ID
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                        columnId: columnId,
                        order: stateRef.current.columns[columnId]?.taskIds.length || 0,
                        sprintId: sprintId,
                    });
                    
                    const _realId = response.data.id;
                    
                    if (task.checklists?.length > 0) {
                        await syncChecklistsForTask(_realId, task.checklists);
                    }

                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'UPDATE_TASK': {
                    const { task } = action.payload;
                    await api.patch(`/tasks/${task.id}`, {
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                        archived: task.isArchived,
                        assigneeId: task.assigneeId,
                        tags: task.tags,
                        sprintId: task.sprintId,
                    });

                    if (task.checklists?.length > 0) {
                        await syncChecklistsForTask(task.id, task.checklists);
                    }

                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'DELETE_TASK': {
                    await api.delete(`/tasks/${action.payload.taskId}`);
                    break;
                }
                case 'MOVE_TASK': {
                    const { taskId, destinationColId, destinationIndex } = action.payload;
                    // Use the specific move endpoint
                    await api.put(`/tasks/${taskId}/move`, {
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

                    const _realId = response.data.id;
                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'DELETE_COLUMN': {
                    await api.delete(`/columns/${action.payload.columnId}`);
                    break;
                }
                case 'REORDER_COLUMN': {
                    // Correct endpoint for reordering columns
                    await api.put(`/columns/reorder`, {
                        boardId: activeBoardId,
                        columnIds: action.payload.columnOrder,
                    });
                    break;
                }
                case 'ADD_CHECKLIST': {
                    const { taskId, checklist } = action.payload;
                    const response = await api.post(`/tasks/${taskId}/checklists`, {
                        title: checklist.title,
                        taskId: taskId
                    });

                    const _realId = response.data.id;
                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
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
                    
                    const task = stateRef.current.tasks[taskId];
                    const localChecklist = task.checklists?.find(cl => cl.id === checklist.id);
                    if (localChecklist) {
                        for (const item of localChecklist.items) {
                            // Skip items with hyphens - they were already handled by ADD_SUBTASK
                            if (item.id.includes('-')) {
                                continue;
                            }
                            await api.patch(`/subtasks/${item.id}`, {
                                content: item.title,
                                completed: item.isCompleted,
                            });
                        }
                    }
                    break;
                }
                case 'UPDATE_COLUMN': {
                    const { column } = action.payload;
                    await api.patch(`/columns/${column.id}`, {
                        title: column.title,
                        wipLimit: column.wipLimit,
                    });
                    break;
                }
                case 'ADD_COMMENT': {
                    const { taskId, comment } = action.payload;
                    await api.post(`/tasks/${taskId}/comments`, {
                        content: comment.content,
                    });

                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'SET_VIEW_MODE': {
                    localStorage.setItem('flowforce_view_mode', action.payload);
                    break;
                }
                case 'SET_SPRINTS': {
                    // Just local state update, no API call
                    break;
                }
                case 'ADD_SPRINT': {
                    // Sprint is already added to state by setHistory, API call handled elsewhere
                    break;
                }
                case 'UPDATE_SPRINT': {
                    // Sprint is already updated in state by setHistory, API call handled elsewhere
                    break;
                }
                case 'DELETE_SPRINT': {
                    // Sprint is already removed from state by setHistory, API call handled elsewhere
                    break;
                }
                case 'SET_ACTIVE_SPRINT': {
                    const newSprintId = action.payload.sprintId;
                    localStorage.setItem('flowforce_active_sprint_id', newSprintId || '');
                    // Re-fetch board with sprint filter to get only sprint tasks
                    if (activeBoardId) {
                        try {
                            const newState = await refreshBoardState(activeBoardId, newSprintId);
                            setHistory({ type: 'SET_STATE', payload: newState });
                        } catch (err) {
                            console.error('Failed to set active sprint:', err);
                            // Revert to previous sprint on failure
                            localStorage.setItem('flowforce_active_sprint_id', stateRef.current.activeSprintId || '');
                        }
                    }
                    break;
                }
                case 'ASSIGN_TASK_TO_SPRINT': {
                    const { taskId, sprintId } = action.payload;
                    await api.patch(`/tasks/${taskId}/sprint`, { sprintId });
                    break;
                }
                case 'ADD_SUBTASK': {
                    const { taskId, checklistId, subtask } = action.payload;
                    await api.post('/subtasks', {
                        content: subtask.title,
                        checklistId: checklistId,
                        priority: subtask.priority?.toUpperCase(),
                    });
                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'UPDATE_SUBTASK': {
                    const { taskId, subtask } = action.payload;
                    await api.patch(`/subtasks/${subtask.id}`, {
                        content: subtask.title,
                        completed: subtask.isCompleted,
                        priority: subtask.priority?.toUpperCase(),
                    });
                    break;
                }
                case 'DELETE_SUBTASK': {
                    const { subtaskId } = action.payload;
                    await api.delete(`/subtasks/${subtaskId}`);
                    break;
                }
                case 'TOGGLE_SUBTASK': {
                    const { subtaskId } = action.payload;
                    await api.patch(`/subtasks/${subtaskId}/toggle`);
                    const newState = await refreshBoardState(activeBoardId, stateRef.current.activeSprintId);
                    setHistory({ type: 'SET_STATE', payload: newState });
                    break;
                }
                case 'REORDER_SUBTASKS': {
                    const { checklistId, orderedSubtasks } = action.payload;
                    await api.patch('/subtasks/reorder', {
                        checklistId,
                        orderedIds: orderedSubtasks.map((s: any) => s.id),
                    });
                    break;
                }
            }
        } catch (err) {
            console.error('Persistence failure:', err);
        }
    }, [activeBoardId, isHydrated, refreshBoardState]);

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
                isHydrated,
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
