import React, { useMemo, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { getSprintColor } from '../lib/sprint-utils';
import SprintBadge from './sprints/SprintBadge';

const PRIORITY_COLORS = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

const getDueDateStatus = (dueDate: string | undefined): 'overdue' | 'today' | 'future' | null => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
    if (due.getTime() === today.getTime()) return 'today';
    return 'future';
};

const formatDueDate = (dueDate: string): string => {
    const date = new Date(dueDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface TaskCardProps {
    task: Task;
    index: number;
    onClick?: () => void;
    onDelete?: () => void;
    isSelected?: boolean;
    onSelect?: (multiSelect: boolean) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick: _onClick, onDelete, isSelected, onSelect }) => {
    const navigate = useNavigate();
    const { state, dispatch } = useKanban();
    const { sprints } = state;

    // Find sprint for this task
    const taskSprint = task.sprintId ? sprints.find(s => s.id === task.sprintId) : null;
    const sprintColor = taskSprint ? getSprintColor(taskSprint, sprints) : null;

    const sprintBorderStyle = useMemo(
        () => (sprintColor ? { borderLeft: `3px solid ${sprintColor}` } : undefined),
        [sprintColor]
    );

    const dueDateBadge = useMemo(() => {
        if (!task.dueDate) return null;
        const status = getDueDateStatus(task.dueDate);
        const label = formatDueDate(task.dueDate);
        const badgeClass = status === 'overdue'
            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
            : status === 'today'
            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
        return <span className={`text-[10px] px-2 py-0.5 rounded ${badgeClass}`}>{label}</span>;
    }, [task.dueDate]);

    // Memoized progress calculation for checklists
    const checklistProgress = useMemo(() => {
        const allItems = task.checklists?.flatMap(cl => cl.items) ?? [];
        const total = allItems.length;
        if (total === 0) return null;
        const completed = allItems.filter(i => i.isCompleted).length;
        const progress = (completed / total) * 100;
        return { total, completed, progress };
    }, [task.checklists]);

    // Memoized progress for legacy subtasks
    const legacyProgress = useMemo(() => {
        if (!task.subTasks?.length) return null;
        const completed = task.subTasks.filter(s => s.isCompleted).length;
        const total = task.subTasks.length;
        const progress = (completed / total) * 100;
        return { total, completed, progress };
    }, [task.subTasks]);

    const handleSprintBadgeClick = useCallback(() => {
        if (taskSprint) {
            dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId: taskSprint.id } });
        }
    }, [taskSprint, dispatch]);

    return (
        <Draggable draggableId={task.id} index={index}>
            {(provided, snapshot) => {
                const child = (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="mb-3 outline-none"
                        style={provided.draggableProps.style}
                    >
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={(e) => {
                                if (e.ctrlKey || e.metaKey) {
                                    e.stopPropagation();
                                    onSelect?.(true);
                                } else {
                                    navigate(`/tasks/${task.id}`);
                                }
                            }}
                            className={`
                glass group p-4 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                ${isSelected ? 'ring-2 ring-accent-blue bg-accent-blue/5' : ''}
                ${snapshot.isDragging
                                    ? 'rotate-[2deg] scale-[1.02] shadow-[0_20px_50px_rgba(37,99,235,0.3)] z-[1000] ring-2 ring-accent-blue/50 bg-white dark:bg-slate-900'
                                    : 'hover:shadow-lg hover:-translate-y-1 hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700'}
              `}
                            style={sprintBorderStyle}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${PRIORITY_COLORS[task.priority]}`}>
                                        {task.priority}
                                    </span>
                                    {dueDateBadge}
                                    {taskSprint && (
                                        <span onClick={(e) => {
                                            e.stopPropagation();
                                            handleSprintBadgeClick();
                                        }}>
                                            <SprintBadge
                                                sprint={taskSprint}
                                                allSprints={sprints}
                                                compact
                                            />
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete?.();
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500"
                                    aria-label={`Delete task ${task.title}`}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>

                            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1 leading-tight">
                                {task.title}
                            </h3>

                            <div className="flex flex-wrap gap-1 mt-auto">
                                {task.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Subtasks — only show if there are any items */}
                            {checklistProgress && (
                                <div className="mt-2 border-slate-100 dark:border-white/5">
                                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden mb-1">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${checklistProgress.progress}%` }}
                                            className={`h-full ${checklistProgress.progress === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                                        />
                                    </div>
                                    <span className="text-[9px] text-slate-400">{checklistProgress.completed}/{checklistProgress.total} done</span>
                                </div>
                            )}

                            {/* Legacy Subtasks Fallback */}
                            {legacyProgress && (
                                <div className="mt-3">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        <span>Progress</span>
                                        <span>{legacyProgress.completed}/{legacyProgress.total}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${legacyProgress.progress}%` }}
                                            className="h-full bg-accent-blue"
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                );

                if (snapshot.isDragging) {
                    return createPortal(child, document.body);
                }

                return child;
            }}
        </Draggable>
    );
};

export default React.memo(TaskCard);
