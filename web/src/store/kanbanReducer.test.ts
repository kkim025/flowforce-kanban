import { describe, it, expect } from 'vitest';
import { kanbanReducer, initialState } from './kanbanReducer';
import { BoardState, Task, Column, Checklist } from '../types';

describe('kanbanReducer', () => {
    it('should handle MOVE_TASK within the same column', () => {
        const state: BoardState = {
            ...initialState,
            tasks: {
                '1': { id: '1', title: 'Task 1' } as any,
                '2': { id: '2', title: 'Task 2' } as any,
            },
            columns: {
                ...initialState.columns,
                'todo': { id: 'todo', title: 'To Do', taskIds: ['1', '2'] },
            },
        };

        const action = {
            type: 'MOVE_TASK' as const,
            payload: {
                taskId: '1',
                sourceColId: 'todo',
                destinationColId: 'todo',
                sourceIndex: 0,
                destinationIndex: 1,
            },
        };

        const newState = kanbanReducer(state, action);
        expect(newState.columns['todo'].taskIds).toEqual(['2', '1']);
    });

    it('should handle ADD_TASK', () => {
        const state: BoardState = {
            ...initialState,
            columns: {
                'todo': { id: 'todo', title: 'To Do', taskIds: [] },
            },
        };

        const newTask: Task = {
            id: '3',
            title: 'Task 3',
            description: '',
            priority: 'medium',
            tags: [],
            subTasks: [],
            checklists: [],
            comments: [],
            activities: [],
            createdAt: '',
        };

        const action = {
            type: 'ADD_TASK' as const,
            payload: {
                columnId: 'todo',
                task: newTask,
            },
        };

        const newState = kanbanReducer(state, action);
        expect(newState.tasks['3']).toEqual(newTask);
        expect(newState.columns['todo'].taskIds).toContain('3');
    });

    it('should handle SET_VIEW_MODE', () => {
        const action = { type: 'SET_VIEW_MODE' as const, payload: 'list' as const };
        const newState = kanbanReducer(initialState, action);
        expect(newState.viewMode).toBe('list');
    });

    it('should handle SET_SEARCH_QUERY', () => {
        const action = { type: 'SET_SEARCH_QUERY' as const, payload: 'test query' };
        const newState = kanbanReducer(initialState, action);
        expect(newState.searchQuery).toBe('test query');
    });

    it('should handle ADD_CHECKLIST', () => {
        const stateWithTask: BoardState = {
            ...initialState,
            tasks: {
                'task-1': { id: 'task-1', title: 'Task 1', checklists: [] } as any
            }
        };
        const newChecklist: Checklist = { id: 'cl-1', title: 'New List', taskId: 'task-1', items: [] };
        const action = {
            type: 'ADD_CHECKLIST' as const,
            payload: { taskId: 'task-1', checklist: newChecklist }
        };
        const newState = kanbanReducer(stateWithTask, action);
        expect(newState.tasks['task-1'].checklists).toHaveLength(1);
        expect(newState.tasks['task-1'].checklists[0].title).toBe('New List');
    });

    it('should handle UPDATE_CHECKLIST', () => {
        const stateWithChecklist: BoardState = {
            ...initialState,
            tasks: {
                'task-1': { 
                    id: 'task-1', 
                    checklists: [{ id: 'cl-1', title: 'Old Title', items: [] }] 
                } as any
            }
        };
        const updatedChecklist: Checklist = { id: 'cl-1', title: 'New Title', taskId: 'task-1', items: [] };
        const action = {
            type: 'UPDATE_CHECKLIST' as const,
            payload: { taskId: 'task-1', checklist: updatedChecklist }
        };
        const newState = kanbanReducer(stateWithChecklist, action);
        expect(newState.tasks['task-1'].checklists[0].title).toBe('New Title');
    });

    it('should handle DELETE_CHECKLIST', () => {
        const stateWithChecklist: BoardState = {
            ...initialState,
            tasks: {
                'task-1': { 
                    id: 'task-1', 
                    checklists: [{ id: 'cl-1', title: 'To Delete', items: [] }] 
                } as any
            }
        };
        const action = {
            type: 'DELETE_CHECKLIST' as const,
            payload: { taskId: 'task-1', checklistId: 'cl-1' }
        };
        const newState = kanbanReducer(stateWithChecklist, action);
        expect(newState.tasks['task-1'].checklists).toHaveLength(0);
    });

    it('should handle ADD_COLUMN', () => {
        const newColumn: Column = {
            id: 'col-new',
            title: 'New Column',
            taskIds: [],
        };

        const action = {
            type: 'ADD_COLUMN' as const,
            payload: { column: newColumn },
        };

        const newState = kanbanReducer(initialState, action);
        expect(newState.columns['col-new']).toEqual(newColumn);
        expect(newState.columnOrder).toContain('col-new');
    });

    it('should handle DELETE_COLUMN and remove its tasks', () => {
        const state: BoardState = {
            ...initialState,
            tasks: {
                'task-1': { id: 'task-1', title: 'Task 1' } as any,
            },
            columns: {
                ...initialState.columns,
                'todo': { id: 'todo', title: 'To Do', taskIds: ['task-1'] },
            },
        };

        const action = {
            type: 'DELETE_COLUMN' as const,
            payload: { columnId: 'todo' },
        };

        const newState = kanbanReducer(state, action);
        expect(newState.columns['todo']).toBeUndefined();
        expect(newState.columnOrder).not.toContain('todo');
        expect(newState.tasks['task-1']).toBeUndefined();
    });

    it('should handle REORDER_COLUMN', () => {
        const newOrder = ['done', 'review', 'inprogress', 'todo', 'backlog'];
        const action = {
            type: 'REORDER_COLUMN' as const,
            payload: { columnOrder: newOrder },
        };

        const newState = kanbanReducer(initialState, action);
        expect(newState.columnOrder).toEqual(newOrder);
    });

    describe('subtask actions', () => {
        const stateWithChecklist: BoardState = {
            ...initialState,
            tasks: {
                'task-1': {
                    id: 'task-1',
                    title: 'Task 1',
                    checklists: [{
                        id: 'cl-1',
                        title: 'Checklist 1',
                        taskId: 'task-1',
                        items: [
                            { id: 'st-1', title: 'Subtask 1', isCompleted: false },
                            { id: 'st-2', title: 'Subtask 2', isCompleted: true },
                        ]
                    }]
                } as any
            }
        };

        it('should handle ADD_SUBTASK', () => {
            const newSubtask = { id: 'st-3', title: 'New Subtask', isCompleted: false };
            const action = {
                type: 'ADD_SUBTASK' as const,
                payload: { taskId: 'task-1', checklistId: 'cl-1', subtask: newSubtask }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items).toHaveLength(3);
            expect(newState.tasks['task-1'].checklists[0].items[2]).toEqual(newSubtask);
        });

        it('should handle UPDATE_SUBTASK', () => {
            const updatedSubtask = { id: 'st-1', title: 'Updated Subtask', isCompleted: true, checklistId: 'cl-1' };
            const action = {
                type: 'UPDATE_SUBTASK' as const,
                payload: { taskId: 'task-1', subtask: updatedSubtask }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items[0].title).toBe('Updated Subtask');
            expect(newState.tasks['task-1'].checklists[0].items[0].isCompleted).toBe(true);
        });

        it('should handle DELETE_SUBTASK', () => {
            const action = {
                type: 'DELETE_SUBTASK' as const,
                payload: { taskId: 'task-1', checklistId: 'cl-1', subtaskId: 'st-1' }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items).toHaveLength(1);
            expect(newState.tasks['task-1'].checklists[0].items[0].id).toBe('st-2');
        });

        it('should handle REORDER_SUBTASKS', () => {
            const reorderedSubtasks = [
                { id: 'st-2', title: 'Subtask 2', isCompleted: true },
                { id: 'st-1', title: 'Subtask 1', isCompleted: false },
            ];
            const action = {
                type: 'REORDER_SUBTASKS' as const,
                payload: { taskId: 'task-1', checklistId: 'cl-1', orderedSubtasks: reorderedSubtasks }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items[0].id).toBe('st-2');
            expect(newState.tasks['task-1'].checklists[0].items[1].id).toBe('st-1');
        });

        it('should handle TOGGLE_SUBTASK with provided taskId', () => {
            const action = {
                type: 'TOGGLE_SUBTASK' as const,
                payload: { taskId: 'task-1', subtaskId: 'st-1' }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items[0].isCompleted).toBe(true);
        });

        it('should handle TOGGLE_SUBTASK without taskId (auto-find)', () => {
            const action = {
                type: 'TOGGLE_SUBTASK' as const,
                payload: { subtaskId: 'st-2' }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState.tasks['task-1'].checklists[0].items[1].isCompleted).toBe(false);
        });

        it('should handle TOGGLE_SUBTASK with task not found', () => {
            const action = {
                type: 'TOGGLE_SUBTASK' as const,
                payload: { subtaskId: 'nonexistent' }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState).toBe(stateWithChecklist);
        });

        it('should return state when TOGGLE_SUBTASK taskId is provided but task does not exist', () => {
            const action = {
                type: 'TOGGLE_SUBTASK' as const,
                payload: { taskId: 'nonexistent-task', subtaskId: 'st-1' }
            };
            const newState = kanbanReducer(stateWithChecklist, action);
            expect(newState).toBe(stateWithChecklist);
        });
    });
});
