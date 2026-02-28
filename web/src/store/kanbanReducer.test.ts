import { describe, it, expect } from 'vitest';
import { kanbanReducer, initialState } from './kanbanReducer';
import { BoardState, Task, Column } from '../types';

describe('kanbanReducer', () => {
    it('should handle MOVE_TASK within the same column', () => {
        const state: BoardState = {
            ...initialState,
            tasks: {
                '1': { id: '1', title: 'Task 1', taskIds: [] } as any,
                '2': { id: '2', title: 'Task 2', taskIds: [] } as any,
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
        const newTask: Task = {
            id: '3',
            title: 'Task 3',
            description: '',
            priority: 'medium',
            tags: [],
            subTasks: [],
            createdAt: '',
        };

        const action = {
            type: 'ADD_TASK' as const,
            payload: {
                columnId: 'todo',
                task: newTask,
            },
        };

        const newState = kanbanReducer(initialState, action);
        expect(newState.tasks['3']).toEqual(newTask);
        expect(newState.columns['todo'].taskIds).toContain('3');
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
});
