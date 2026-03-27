import { Sprint, Task } from '../types';
import { SPRINT_COLORS } from './constants';

/**
 * Get a sprint color. If the sprint has a custom color, use it.
 * Otherwise, fall back to index-based calculation from the color palette.
 */
export const getSprintColor = (sprint: Sprint, sprints: Sprint[]): string => {
    if (sprint.color) {
        return sprint.color;
    }
    const index = sprints.findIndex(s => s.id === sprint.id);
    return SPRINT_COLORS[index % SPRINT_COLORS.length];
};

/**
 * Find a sprint by ID from an array of sprints
 */
export const getSprintById = (sprints: Sprint[], id: string): Sprint | undefined => {
    return sprints.find(s => s.id === id);
};

/**
 * Get the active sprint from an array of sprints
 */
export const getActiveSprint = (sprints: Sprint[]): Sprint | undefined => {
    return sprints.find(s => s.status === 'ACTIVE');
};

/**
 * Filter tasks by sprint ID
 * If sprintId is null, returns all tasks
 * If sprintId is provided, returns only tasks with that sprintId
 */
export const filterTasksBySprint = (tasks: Task[], sprintId: string | null): Task[] => {
    if (sprintId === null) {
        return tasks;
    }
    return tasks.filter(task => task.sprintId === sprintId);
};

/**
 * Calculate sprint progress - completed vs total tasks
 */
export const getSprintProgress = (
    sprint: Sprint,
    tasks: Task[],
    doneColumnIds: string[] = []
): { completed: number; total: number } => {
    const sprintTasks = tasks.filter(task => task.sprintId === sprint.id);
    const total = sprintTasks.length;
    const completed = sprintTasks.filter(task =>
        doneColumnIds.some(colId => task.columnId === colId)
    ).length;
    return { completed, total };
};

/**
 * Check if a sprint is overdue (end date has passed)
 */
export const isSprintOverdue = (sprint: Sprint): boolean => {
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    return sprint.status === 'ACTIVE' && endDate < now;
};

/**
 * Get days remaining until sprint end date
 */
export const getDaysLeft = (sprint: Sprint): number | null => {
    if (sprint.status !== 'ACTIVE') return null;
    const now = new Date();
    const endDate = new Date(sprint.endDate);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Format date range for display (e.g., "Mar 15 - Mar 28")
 */
export const formatSprintDateRange = (startDate: string, endDate: string): string => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', formatOptions)} - ${end.toLocaleDateString('en-US', formatOptions)}`;
};