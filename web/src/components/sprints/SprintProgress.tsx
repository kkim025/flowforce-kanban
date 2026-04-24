import React from 'react';
import { Sprint, Task } from '../../types';
import { filterTasksBySprint, getDaysLeft, isSprintOverdue } from '../../lib/sprint-utils';
import { UI_LABELS } from '../../lib/constants';

interface SprintProgressProps {
    sprint: Sprint;
    tasks: Task[];
    columnOrder: string[];
}

const SprintProgress: React.FC<SprintProgressProps> = ({
    sprint,
    tasks,
    columnOrder,
}) => {
    // Filter tasks for this sprint
    const sprintTasks = filterTasksBySprint(tasks, sprint.id);

    // Determine "done" columns - typically the last column(s)
    // For now, we'll use a simple heuristic: tasks in the last column are "done"
    const _doneColumnId = columnOrder[columnOrder.length - 1];
    const _inProgressColumnId = columnOrder.length > 1 ? columnOrder[columnOrder.length - 2] : null;

    // Count completed tasks (tasks in the last column)
    const _completedTasks = sprintTasks.filter(_task => {
        // Find which column this task is in
        // We don't have direct column reference in Task, so we use the task's position
        // For simplicity, we'll count tasks that are marked as done based on column
        // This would need to be enhanced with actual column tracking
        return false; // Simplified - actual completion tracking would need more context
    });

    const totalTasks = sprintTasks.length;
    const _completedCount = 0; // Simplified - would need proper completion tracking

    // Get days left
    const daysLeft = getDaysLeft(sprint);
    const overdue = isSprintOverdue(sprint);

    if (sprint.status !== 'ACTIVE') {
        return null;
    }

    return (
        <div className="flex items-center gap-3 text-xs">
            {/* Task count */}
            <span className="text-slate-400">
                <span className="font-bold text-white">{totalTasks}</span> tasks
            </span>

            {/* Days left indicator */}
            {daysLeft !== null && (
                <>
                    <span className="text-slate-600">|</span>
                    {overdue ? (
                        <span className="text-red-400 font-bold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {UI_LABELS.SPRINT_OVERDUE}
                        </span>
                    ) : daysLeft <= 2 ? (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {daysLeft} {UI_LABELS.DAYS_LEFT}
                        </span>
                    ) : (
                        <span className="text-slate-400">
                            {daysLeft} {UI_LABELS.DAYS_LEFT}
                        </span>
                    )}
                </>
            )}
        </div>
    );
};

export default SprintProgress;
