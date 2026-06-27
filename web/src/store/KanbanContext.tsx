import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { BoardState, KanbanAction, Checklist } from '../types';
import { kanbanReducer, initialState } from './kanbanReducer';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { mapApiBoardToState } from '../lib/mappers';
import { useToast } from '../context/ToastContext';

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
    allBoards: { id: string; title: string; status?: 'ACTIVE' | 'ARCHIVED' }[];
    setActiveBoard: (boardId: string) => Promise<void>;
    deleteBoard: (boardId: string) => Promise<void>;
    addBoard: (board: { id: string; title: string; status?: string }) => void;
    renameBoard: (boardId: string, title: string) => void;
    updateTaskDueDate: (taskId: string, dueDate: string | null) => void;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const [allBoards, setAllBoards] = useState<{ id: string; title: string; status?: 'ACTIVE' | 'ARCHIVED' }[]>([]);
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
    const refreshBoardState = useCallback(async (boardId: string, sprintId: string | null, sprints?: any[]) => {
        const refreshedBoard = await api.get(getBoardUrl(boardId, sprintId || undefined));
        return mapApiBoardToState(refreshedBoard.data, sprints || stateRef.current.sprints);
    }, []);

    // Switch to a different board
    const setActiveBoard = useCallback(async (boardId: string) => {
        try {
            // Save to localStorage
            localStorage.setItem('flowforce_active_board_id', boardId);
            setActiveBoardId(boardId);

            // Fetch full board data
            const refreshed = await api.get(getBoardUrl(boardId));
            const newState = mapApiBoardToState(refreshed.data);

            // Load sprints for the new board
            let sprints: any[] = [];
            let activeSprintId: string | null = null;
            try {
                const sprintsResponse = await api.get(`/sprints/boards/${boardId}`);
                sprints = sprintsResponse.data || [];

                // Default to active sprint if one exists
                const activeSprint = sprints.find((s: any) => s.status === 'ACTIVE');
                activeSprintId = activeSprint?.id || null;
            } catch (err) {
                console.warn('Could not load sprints:', err);
            }

            newState.sprints = sprints;
            newState.activeSprintId = activeSprintId;

            // If there's an active sprint, re-fetch board with sprint filter
            if (activeSprintId) {
                const sprintFilteredState = {
                    ...mapApiBoardToState((await api.get(getBoardUrl(boardId, activeSprintId))).data),
                    sprints: sprints,
                    activeSprintId: activeSprintId,
                };
                setHistory({ type: 'SET_STATE', payload: sprintFilteredState });
            } else {
                setHistory({ type: 'SET_STATE', payload: newState });
            }
        } catch (err) {
            console.error('Failed to switch board:', err);
        }
    }, []);

    // Delete a board and switch to another if needed
    const deleteBoard = useCallback(async (boardId: string) => {
        const remaining = allBoards.filter(b => b.id !== boardId);

        // Optimistic remove
        setAllBoards(remaining);

        // If we deleted the active board, switch to another
        if (boardId === activeBoardId && remaining.length > 0) {
            await setActiveBoard(remaining[0].id);
        }
    }, [activeBoardId, allBoards, setActiveBoard]);

    // Add a new board to the list
    const addBoard = useCallback((board: { id: string; title: string; status?: string }) => {
        setAllBoards(prev => [...prev, board as { id: string; title: string; status?: 'ACTIVE' | 'ARCHIVED' }]);
    }, []);

    // Rename a board with optimistic update and rollback on failure
    const renameBoard = useCallback(async (boardId: string, newTitle: string) => {
        // Capture previous title before state update
        const previousTitle = allBoards.find(b => b.id === boardId)?.title || '';

        // Optimistic update
        setAllBoards(prev => prev.map(b => b.id === boardId ? { ...b, title: newTitle } : b));

        try {
            await api.patch(`/boards/${boardId}`, { title: newTitle });
        } catch (err) {
            // Rollback on failure
            setAllBoards(prev => prev.map(b => b.id === boardId ? { ...b, title: previousTitle } : b));
            console.error('Failed to rename board:', err);
        }
    }, [allBoards]);

    // Initial Hydration
    useEffect(() => {
        if (!isAuthenticated) return;

        const loadBoardData = async () => {
            setIsSyncing(true);
            try {
                const response = await api.get('/boards');
                const boards = response.data;
                setAllBoards(boards);
                let board;

                // Restore active board from localStorage if available
                const savedBoardId = localStorage.getItem('flowforce_active_board_id');
                const savedBoardExists = boards.some((b: any) => b.id === savedBoardId);

                if (boards.length === 0) {
                    const newBoardRes = await api.post('/boards', { title: 'Personal Board' });
                    board = newBoardRes.data;

                    // Note: CreateBoardUseCase already adds default columns: To Do, In Progress, Done
                    // But we might want the specific ones from the frontend template
                    // For now, let's just use what's returned
                    const refreshed = await api.get(`/boards/${board.id}`);
                    board = refreshed.data;
                } else if (savedBoardExists) {
                    // Load saved board
                    const refreshed = await api.get(`/boards/${savedBoardId}`);
                    board = refreshed.data;
                } else {
                    board = boards[0];
                }

                setActiveBoardId(board.id);
                localStorage.setItem('flowforce_active_board_id', board.id);
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
                    // Pass sprints directly to refreshBoardState - stateRef not yet updated
                    const loadedSprints = mappedState.sprints;
                    mappedState.activeSprintId = activeSprintId;
                    const refreshedState = await refreshBoardState(board.id, null, loadedSprints);
                    setHistory({ type: 'SET_STATE', payload: { ...refreshedState, activeSprintId } });
                }
            } catch (err) {
                console.error('Initial load error:', err);
                // Surface the real error to the user so the next "infinite
                // loading" report carries an actionable message instead of a
                // screenshot. See issue #25.
                const message =
                    err instanceof Error && err.message
                        ? `Could not load your boards: ${err.message}`
                        : 'Could not load your boards. Please refresh and try again.';
                showToast(message, 'error');
            } finally {
                // Always flip the hydration gate, even when an API call throws.
                // If this stays false the Board renders "Loading Board..." forever,
                // because `setIsHydrated(true)` previously sat inside the try block
                // *after* the setHistory call — any throw between them stranded the
                // spinner. See flowforce-kanban issue #25.
                setIsHydrated(true);
                setIsSyncing(false);
            }
        };

        loadBoardData();
        // showToast and refreshBoardState intentionally omitted from deps:
        // depending on showToast would re-run board hydration whenever the
        // Toast provider re-creates its function reference, and
        // refreshBoardState is itself useCallback([]).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated]);

    const syncChecklistsForTask = async (taskId: string, checklists: Checklist[]) => {
        const results = await Promise.allSettled(
            checklists.map(async (cl) => {
                if (cl.id.includes('-')) {
                    const res = await api.post(`/tasks/${taskId}/checklists`, { title: cl.title, taskId });
                    const checklistId = res.data.id;
                    await Promise.all(
                        cl.items.map((item) =>
                            api.post('/subtasks', {
                                content: item.title,
                                checklistId,
                                completed: item.isCompleted,
                                priority: item.priority?.toUpperCase(),
                            }),
                        ),
                    );
                } else {
                    await api.patch(`/checklists/${cl.id}`, { title: cl.title });
                    await Promise.all(
                        cl.items
                            .filter((item) => !item.id.includes('-'))
                            .map((item) =>
                                api.patch(`/subtasks/${item.id}`, {
                                    content: item.title,
                                    completed: item.isCompleted,
                                }),
                            ),
                    );
                }
            }),
        );

        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            const msgs = failures.map((r) => (r as PromiseRejectedResult).reason?.message ?? 'Unknown error');
            throw new Error(`Failed to sync checklists: ${msgs.join('; ')}`);
        }
    };

    // Async Synchronizer
    const wrappedDispatch = useCallback(async (action: KanbanAction) => {
        // Skip history for pure local-state actions (no API call needed)
        if (action.type === 'SET_SPRINTS' || action.type === 'SET_VIEW_MODE') {
            // These are pure local-state actions, no history or API needed
            if (action.type === 'SET_VIEW_MODE') {
                localStorage.setItem('flowforce_view_mode', action.payload);
            }
            // Update state via setHistory before early return
            setHistory(action);
            return;
        }

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
                            const newState = await refreshBoardState(activeBoardId, newSprintId, stateRef.current.sprints);
                            setHistory({ type: 'SET_STATE', payload: { ...newState, activeSprintId: newSprintId } });
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
                    const { checklistId, subtask } = action.payload;
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
                    const { subtask } = action.payload;
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

    const updateTaskDueDate = useCallback((taskId: string, dueDate: string | null) => {
        // Store previous value for potential rollback
        const previousDueDate = stateRef.current.tasks[taskId]?.dueDate ?? null;

        // Optimistic state update
        setHistory({ type: 'UPDATE_TASK_DUE_DATE', payload: { taskId, dueDate } });

        // API call
        api.patch(`/tasks/${taskId}`, { dueDate }).catch(() => {
            // Rollback on failure
            setHistory({ type: 'UPDATE_TASK_DUE_DATE', payload: { taskId, dueDate: previousDueDate } });
        });
    }, []);

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
                allBoards,
                setActiveBoard,
                deleteBoard,
                addBoard,
                renameBoard,
                updateTaskDueDate,
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
