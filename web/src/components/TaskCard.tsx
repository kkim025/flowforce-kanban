import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Task } from '../types';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

interface TaskCardProps {
    task: Task;
    index: number;
    onClick?: () => void;
    onDelete?: () => void;
    isSelected?: boolean;
    onSelect?: (multiSelect: boolean) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onClick, onDelete, isSelected, onSelect }) => {
    const priorityColors = {
        low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

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
                                    onClick?.();
                                }
                            }}
                            className={`
                glass group p-4 rounded-xl transition-all duration-300 cursor-pointer relative overflow-hidden
                ${isSelected ? 'ring-2 ring-accent-blue bg-accent-blue/5' : ''}
                ${snapshot.isDragging
                                    ? 'rotate-[2deg] scale-[1.02] shadow-[0_20px_50px_rgba(37,99,235,0.3)] z-[1000] ring-2 ring-accent-blue/50 bg-white dark:bg-slate-900'
                                    : 'hover:shadow-lg hover:-translate-y-1 hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700'}
              `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                                    {task.priority}
                                </span>
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
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                                    {task.description}
                                </p>
                            )}

                            <div className="flex flex-wrap gap-1 mt-auto">
                                {task.tags.map(tag => (
                                    <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {task.subTasks.length > 0 && (
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
