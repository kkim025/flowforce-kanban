import React, { createContext, useContext, useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { BoardState, KanbanAction } from '../types';
import { kanbanReducer, initialState } from './kanbanReducer';
import api from '../lib/api';
import { useAuth } from './AuthContext';
import { mapApiBoardToState } from '../lib/mappers';

interface KanbanContextType {
    state: BoardState;
    dispatch: React.Dispatch<KanbanAction>;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isSyncing: boolean;
    activeBoardId: string | null;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user } = useAuth();
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
    const isInitialLoad = useRef(true);
    
    const [history, setHistory] = useReducer(
        (h: { past: BoardState[]; present: BoardState; future: BoardState[] }, action: KanbanAction) => {
            const { past, present, future } = h;

            if (action.type === 'INTERNAL_UNDO') {
                if (past.length === 0) return h;
                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);
                return { past: newPast, present: previous, future: [present, ...future] };
            }

            if (action.type === 'INTERNAL_REDO') {
                if (future.length === 0) return h;
                const next = future[0];
                const newFuture = future.slice(1);
                return { past: [...past, present], present: next, future: newFuture };
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

    // Initial Load from API
    useEffect(() => {
        if (!isAuthenticated) return;

        const loadBoardData = async () => {
            setIsSyncing(true);
            try {
                const response = await api.get('/boards');
                let board;

                if (response.data.length === 0) {
                    // Create default board for new users
                    const newBoard = await api.post('/boards', { title: 'Personal Board' });
                    board = newBoard.data;
                    
                    // Create default columns
                    const columnTitles = ['To Do', 'In Progress', 'Done'];
                    for (let i = 0; i < columnTitles.length; i++) {
                        await api.post('/columns', { title: columnTitles[i], boardId: board.id, order: i });
                    }
                    
                    // Fetch fully hydrated board
                    const fullBoard = await api.get(`/boards/${board.id}`);
                    board = fullBoard.data;
                } else {
                    board = response.data[0];
                }

                setActiveBoardId(board.id);
                const mappedState = mapApiBoardToState(board);
                setHistory({ type: 'SET_STATE', payload: mappedState });
                isInitialLoad.current = false;
            } catch (err) {
                console.error('Failed to initialize board:', err);
            } finally {
                setIsSyncing(false);
            }
        };

        loadBoardData();
    }, [isAuthenticated]);

    // Side-effect persistence (Optimistic UI + Backend Sync)
    const wrappedDispatch = useCallback(async (action: KanbanAction) => {
        // 1. Update UI immediately
        setHistory(action);

        if (!activeBoardId) return;

        // 2. Persist to backend
        try {
            switch (action.type) {
                case 'ADD_TASK': {
                    const { columnId, task } = action.payload;
                    await api.post('/tasks', {
                        content: task.title,
                        description: task.description,
                        priority: task.priority.toUpperCase(),
                        columnId: columnId,
                        order: 999, // Should be calculated or handled by backend reorder
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
                    // Note: In a full implementation, we'd also trigger reorders for other tasks
                    break;
                }
                // Add more cases as needed for columns, etc.
            }
        } catch (err) {
            console.error('Failed to sync action to backend:', err);
            // In a real app, you might want to show a toast or revert the optimistic update
        }
    }, [activeBoardId]);

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
