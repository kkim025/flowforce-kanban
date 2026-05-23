import { Task } from '../types';

export interface TaskFilters {
    assigneeFilter: string | null;
    priorityFilter: string | null;
    tagFilter: string[];
}

/**
 * Checks if a task matches the given filters.
 * Returns true if the task passes all active filter conditions.
 */
export function taskMatchesFilters(task: Task, filters: TaskFilters): boolean {
    // Assignee filter
    if (filters.assigneeFilter !== null) {
        if (task.assigneeId !== filters.assigneeFilter) {
            return false;
        }
    }

    // Priority filter
    if (filters.priorityFilter !== null) {
        if (task.priority !== filters.priorityFilter) {
            return false;
        }
    }

    // Tag filter (OR logic - task matches if it has ANY of the selected tags)
    if (filters.tagFilter.length > 0) {
        const hasMatchingTag = filters.tagFilter.some(tag => task.tags.includes(tag));
        if (!hasMatchingTag) {
            return false;
        }
    }

    return true;
}

/**
 * Filters a list of tasks by assignee, priority, and tags.
 * Returns the filtered array.
 */
export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
    return tasks.filter(task => taskMatchesFilters(task, filters));
}