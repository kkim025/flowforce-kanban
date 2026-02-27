import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { BoardState, KanbanAction, Task } from '../types';
import { kanbanReducer, initialState } from './kanbanReducer';

interface KanbanContextType {
    state: BoardState;
    dispatch: React.Dispatch<KanbanAction>;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const KanbanContext = createContext<KanbanContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'flowforce-kanban-state';

export const KanbanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [history, setHistory] = useReducer(
        (h: { past: BoardState[]; present: BoardState; future: BoardState[] }, action: KanbanAction) => {
            const { past, present, future } = h;

            if (action.type === 'INTERNAL_UNDO') {
                if (past.length === 0) return h;
                const previous = past[past.length - 1];
                const newPast = past.slice(0, past.length - 1);
                return {
                    past: newPast,
                    present: previous,
                    future: [present, ...future],
                };
            }

            if (action.type === 'INTERNAL_REDO') {
                if (future.length === 0) return h;
                const next = future[0];
                const newFuture = future.slice(1);
                return {
                    past: [...past, present],
                    present: next,
                    future: newFuture,
                };
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
        {
            past: [],
            present: initialState,
            future: [],
        }
    );

    // Load from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                setHistory({ type: 'SET_STATE', payload: parsed });
            } catch (e) {
                console.error('Failed to load state', e);
            }
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(history.present));
    }, [history.present]);

    const undo = useCallback(() => setHistory({ type: 'INTERNAL_UNDO' }), []);
    const redo = useCallback(() => setHistory({ type: 'INTERNAL_REDO' }), []);

    return (
        <KanbanContext.Provider
            value={{
                state: history.present,
                dispatch: setHistory,
                undo,
                redo,
                canUndo: history.past.length > 0,
                canRedo: history.future.length > 0,
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
