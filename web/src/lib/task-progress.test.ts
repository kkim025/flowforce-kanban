import { describe, it, expect } from 'vitest';
import { getTaskProgress } from './task-progress';
import type { Task } from '../types';

const makeTask = (overrides: Partial<Task> = {}): Task => ({
    id: 't1',
    title: 'Test',
    description: '',
    priority: 'medium',
    tags: [],
    subTasks: [],
    checklists: [],
    comments: [],
    activities: [],
    createdAt: new Date().toISOString(),
    ...overrides,
});

describe('getTaskProgress (issue #35)', () => {
    it('returns zero state for an empty task', () => {
        const p = getTaskProgress(makeTask());
        expect(p).toEqual({ completed: 0, total: 0, progress: 0, isComplete: false });
    });

    it('counts only checklist items when there are no legacy subtasks', () => {
        const p = getTaskProgress(makeTask({
            checklists: [{
                id: 'c1', title: 'C', taskId: 't1',
                items: [
                    { id: 'a', title: 'a', isCompleted: true },
                    { id: 'b', title: 'b', isCompleted: false },
                    { id: 'c', title: 'c', isCompleted: true },
                ],
            }],
        }));
        expect(p.completed).toBe(2);
        expect(p.total).toBe(3);
        expect(p.progress).toBeCloseTo(66.667, 2);
        expect(p.isComplete).toBe(false);
    });

    it('counts only legacy subtasks when there are no checklists', () => {
        const p = getTaskProgress(makeTask({
            subTasks: [
                { id: 'a', title: 'a', isCompleted: true },
                { id: 'b', title: 'b', isCompleted: false },
            ],
        }));
        expect(p.completed).toBe(1);
        expect(p.total).toBe(2);
        expect(p.progress).toBe(50);
        expect(p.isComplete).toBe(false);
    });

    it('COMBINES both lists (regression for issue #35 — previously used `||`)', () => {
        // 1 done legacy + 2 done checklist items out of 2 legacy + 3 checklist = 3/5
        const p = getTaskProgress(makeTask({
            subTasks: [
                { id: 'l1', title: 'l1', isCompleted: true },
                { id: 'l2', title: 'l2', isCompleted: false },
            ],
            checklists: [{
                id: 'c1', title: 'C', taskId: 't1',
                items: [
                    { id: 'a', title: 'a', isCompleted: true },
                    { id: 'b', title: 'b', isCompleted: true },
                    { id: 'c', title: 'c', isCompleted: false },
                ],
            }],
        }));
        expect(p.completed).toBe(3);
        expect(p.total).toBe(5);
        expect(p.progress).toBe(60);
        expect(p.isComplete).toBe(false);
    });

    it('marks isComplete=true when every item in both lists is done', () => {
        const p = getTaskProgress(makeTask({
            subTasks: [{ id: 'l1', title: 'l1', isCompleted: true }],
            checklists: [{
                id: 'c1', title: 'C', taskId: 't1',
                items: [{ id: 'a', title: 'a', isCompleted: true }],
            }],
        }));
        expect(p.isComplete).toBe(true);
        expect(p.progress).toBe(100);
    });

    it('treats missing arrays as empty (defensive — matches mapper behaviour)', () => {
        const p = getTaskProgress({} as Pick<Task, 'subTasks' | 'checklists'>);
        expect(p.total).toBe(0);
        expect(p.isComplete).toBe(false);
    });

    it('handles a checklist with no items array gracefully', () => {
        const p = getTaskProgress(makeTask({
            checklists: [{ id: 'c1', title: 'C', taskId: 't1' } as any],
        }));
        expect(p.total).toBe(0);
        expect(p.isComplete).toBe(false);
    });
});