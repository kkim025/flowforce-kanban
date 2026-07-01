import { Task } from '../types';

export interface TaskProgress {
    completed: number;
    total: number;
    progress: number; // 0..100
    isComplete: boolean;
}

/**
 * Roll up a task's subtasks + checklist items into a single progress bar.
 *
 * Why one helper: TaskCard and ListView both render "this task is X% done"
 * based on subtask completion. Previously they computed it inline with a
 * `||` chain that silently dropped checklist items when legacy subTasks
 * were also present (issue #35). Centralising the math makes the
 * invariant — *every* trackable subtask counts toward parent completion
 * — impossible to violate in one place while keeping it in the other.
 *
 * @param task - any task-like object. Missing checklists / subTasks
 *   arrays are treated as empty (returns isComplete=false, progress=0).
 */
export function getTaskProgress(task: Pick<Task, 'subTasks' | 'checklists'>): TaskProgress {
    const checklistItems = (task.checklists ?? []).flatMap(cl => cl.items ?? []);
    const legacyItems = task.subTasks ?? [];
    const total = checklistItems.length + legacyItems.length;

    if (total === 0) {
        return { completed: 0, total: 0, progress: 0, isComplete: false };
    }

    const completed =
        checklistItems.filter(i => i.isCompleted).length +
        legacyItems.filter(s => s.isCompleted).length;

    const progress = (completed / total) * 100;
    return { completed, total, progress, isComplete: completed === total };
}
