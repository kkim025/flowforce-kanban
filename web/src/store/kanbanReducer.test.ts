import { describe, it, expect } from 'vitest';
import { kanbanReducer, initialState } from './kanbanReducer';
import { BoardState, Task } from '../types';

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
});
