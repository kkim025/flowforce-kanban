import { describe, it, expect } from 'vitest';
import { taskMatchesFilters, filterTasks } from './filter-utils';
import { Task } from '../types';

const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'task-1',
    title: 'Test Task',
    description: '',
    priority: 'medium' as const,
    assigneeId: undefined,
    tags: [],
    subTasks: [],
    checklists: [],
    comments: [],
    activities: [],
    createdAt: new Date().toISOString(),
    isArchived: false,
    ...overrides,
});

describe('filter-utils', () => {
    describe('taskMatchesFilters', () => {
        it('returns true when no filters are active', () => {
            const task = createTask();
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });

        it('filters by assignee when assigneeFilter is set', () => {
            const task = createTask({ assigneeId: 'user-1' });
            const filters = { assigneeFilter: 'user-1', priorityFilter: null, tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });

        it('returns false when assignee does not match', () => {
            const task = createTask({ assigneeId: 'user-1' });
            const filters = { assigneeFilter: 'user-2', priorityFilter: null, tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(false);
        });

        it('filters by priority when priorityFilter is set', () => {
            const task = createTask({ priority: 'high' as const });
            const filters = { assigneeFilter: null, priorityFilter: 'high', tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });

        it('returns false when priority does not match', () => {
            const task = createTask({ priority: 'low' as const });
            const filters = { assigneeFilter: null, priorityFilter: 'high', tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(false);
        });

        it('filters by tags (OR logic - task matches if it has ANY of the selected tags)', () => {
            const task = createTask({ tags: ['frontend', 'bug'] });
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: ['frontend'] };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });

        it('returns false when no tags match', () => {
            const task = createTask({ tags: ['backend'] });
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: ['frontend', 'bug'] };
            expect(taskMatchesFilters(task, filters)).toBe(false);
        });

        it('combines multiple filters (AND logic)', () => {
            const task = createTask({
                assigneeId: 'user-1',
                priority: 'high' as const,
                tags: ['frontend']
            });
            const filters = {
                assigneeFilter: 'user-1',
                priorityFilter: 'high',
                tagFilter: ['frontend']
            };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });

        it('returns false when one of multiple filters does not match', () => {
            const task = createTask({
                assigneeId: 'user-1',
                priority: 'high' as const,
                tags: ['backend']
            });
            const filters = {
                assigneeFilter: 'user-1',
                priorityFilter: 'high',
                tagFilter: ['frontend']
            };
            expect(taskMatchesFilters(task, filters)).toBe(false);
        });

        it('handles empty tag array on task', () => {
            const task = createTask({ tags: [] });
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: ['frontend'] };
            expect(taskMatchesFilters(task, filters)).toBe(false);
        });

        it('handles undefined assigneeId', () => {
            const task = createTask({ assigneeId: undefined });
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: [] };
            expect(taskMatchesFilters(task, filters)).toBe(true);
        });
    });

    describe('filterTasks', () => {
        it('returns all tasks when no filters are active', () => {
            const tasks = [
                createTask({ id: 'task-1', title: 'Task 1' }),
                createTask({ id: 'task-2', title: 'Task 2' }),
            ];
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: [] };
            expect(filterTasks(tasks, filters)).toHaveLength(2);
        });

        it('filters tasks by assignee', () => {
            const tasks = [
                createTask({ id: 'task-1', assigneeId: 'user-1' }),
                createTask({ id: 'task-2', assigneeId: 'user-2' }),
            ];
            const filters = { assigneeFilter: 'user-1', priorityFilter: null, tagFilter: [] };
            expect(filterTasks(tasks, filters)).toHaveLength(1);
            expect(filterTasks(tasks, filters)[0].id).toBe('task-1');
        });

        it('filters tasks by priority', () => {
            const tasks = [
                createTask({ id: 'task-1', priority: 'high' as const }),
                createTask({ id: 'task-2', priority: 'low' as const }),
            ];
            const filters = { assigneeFilter: null, priorityFilter: 'high', tagFilter: [] };
            expect(filterTasks(tasks, filters)).toHaveLength(1);
            expect(filterTasks(tasks, filters)[0].id).toBe('task-1');
        });

        it('filters tasks by tags', () => {
            const tasks = [
                createTask({ id: 'task-1', tags: ['frontend'] }),
                createTask({ id: 'task-2', tags: ['backend'] }),
            ];
            const filters = { assigneeFilter: null, priorityFilter: null, tagFilter: ['frontend'] };
            expect(filterTasks(tasks, filters)).toHaveLength(1);
            expect(filterTasks(tasks, filters)[0].id).toBe('task-1');
        });

        it('returns empty array when no tasks match', () => {
            const tasks = [
                createTask({ id: 'task-1', assigneeId: 'user-1' }),
                createTask({ id: 'task-2', assigneeId: 'user-2' }),
            ];
            const filters = { assigneeFilter: 'user-3', priorityFilter: null, tagFilter: [] };
            expect(filterTasks(tasks, filters)).toHaveLength(0);
        });
    });
});