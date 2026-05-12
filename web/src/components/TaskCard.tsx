import React, { useMemo, useCallback, useState } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CheckSquare, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useKanban } from '../store/KanbanContext';
import { getSprintColor } from '../lib/sprint-utils';
import SprintBadge from './sprints/SprintBadge';
import SubtaskPopover from './SubtaskPopover';

const PRIORITY_COLORS = {
    low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
} as const;

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
    const [showSubtaskPopover, setShowSubtaskPopover] = useState(false);

    // Find sprint for this task
    const taskSprint = task.sprintId ? sprints.find(s => s.id === task.sprintId) : null;
    const sprintColor = taskSprint ? getSprintColor(taskSprint, sprints) : null;

    const sprintBorderStyle = useMemo(
        () => (sprintColor ? { borderLeft: `3px solid ${sprintColor}` } : undefined),
        [sprintColor]
    );

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

                            {task.description && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 prose prose-slate dark:prose-invert prose-xs">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                        {task.description}
                                    </ReactMarkdown>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-1 mt-auto">
                                {task.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {/* Subtasks — only show if there are any items */}
                            {task.checklists && task.checklists.some(cl => cl.items.length > 0) && (
                                <>
                                    {/* Per-checklist dots + overall progress */}
                                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {task.checklists.map(cl => {
                                                    const total = cl.items.length;
                                                    if (total === 0) return null;
                                                    const completed = cl.items.filter(i => i.isCompleted).length;
                                                    // Assign a consistent color per checklist index
                                                    const dotColors = ['bg-purple-500', 'bg-teal-500', 'bg-amber-500', 'bg-pink-500'];
                                                    const dotColor = dotColors[task.checklists.indexOf(cl) % dotColors.length];
                                                    return (
                                                        <div key={cl.id} className="flex items-center gap-1" title={`${cl.title}: ${completed}/${total}`}>
                                                            <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                                            <span className="text-[9px] text-slate-400">{completed}/{total}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setShowSubtaskPopover(!showSubtaskPopover); }}
                                                className="text-slate-400 hover:text-accent-blue transition-colors"
                                                title="Add subtask"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Overall progress bar */}
                                        {(() => {
                                            const allItems = task.checklists.flatMap(cl => cl.items);
                                            const total = allItems.length;
                                            const completed = allItems.filter(i => i.isCompleted).length;
                                            const progress = total > 0 ? (completed / total) * 100 : 0;
                                            return (
                                                <>
                                                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800/50 rounded-full overflow-hidden mb-1">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${progress}%` }}
                                                            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] text-slate-400">{completed}/{total} done</span>
                                                </>
                                            );
                                        })()}

                                        {/* Inline subtask creation popover */}
                                        {showSubtaskPopover && (
                                            <SubtaskPopover
                                                taskId={task.id}
                                                checklists={task.checklists.map(cl => ({ id: cl.id, title: cl.title }))}
                                                onClose={() => setShowSubtaskPopover(false)}
                                                onAdded={() => {}}
                                            />
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Legacy Subtasks Fallback */}
                            {!task.checklists?.length && task.subTasks && task.subTasks.length > 0 && (
                                <div className="mt-3">
                                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                                        <span>Progress</span>
                                        <span>{task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length}</span>
                                    </div>
                                    <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(task.subTasks.filter(s => s.isCompleted).length / task.subTasks.length) * 100}%` }}
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
