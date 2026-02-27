import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task } from '../types';
import TaskCard from './TaskCard';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onAddTask: () => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    selectedTaskIds: string[];
    onSelectTask: (taskId: string, multiSelect: boolean) => void;
}

const Column: React.FC<ColumnProps> = ({ column, tasks, onAddTask, onEditTask, onDeleteTask, selectedTaskIds, onSelectTask }) => {
    return (
        <div className="flex flex-col w-80 min-h-[500px] h-full">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <h2 className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest text-xs">
                        {column.title}
                    </h2>
                    <span className={`
                        text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors
                        ${column.wipLimit && tasks.length > column.wipLimit
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}
                    `}>
                        {tasks.length}{column.wipLimit ? ` / ${column.wipLimit}` : ''}
                    </span>
                </div>
                <button
                    onClick={onAddTask}
                    className="text-slate-400 hover:text-accent-blue transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </div>

            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
              flex-1 rounded-2xl p-2 transition-colors duration-200
              ${snapshot.isDraggingOver ? 'bg-accent-blue/5' : 'bg-transparent'}
            `}
                    >
                        {tasks.map((task, index) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                index={index}
                                onClick={() => onEditTask(task)}
                                onDelete={() => onDeleteTask(task.id)}
                                isSelected={selectedTaskIds.includes(task.id)}
                                onSelect={(multiSelect) => onSelectTask(task.id, multiSelect)}
                            />
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default React.memo(Column);
