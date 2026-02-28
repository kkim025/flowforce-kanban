import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task } from '../types';
import TaskCard from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    onAddTask: () => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    selectedTaskIds: string[];
    onSelectTask: (taskId: string, multiSelect: boolean) => void;
}

const getColumnColor = (id: string) => {
    switch (id.toLowerCase()) {
        case 'backlog': return 'border-t-slate-400';
        case 'todo': return 'border-t-blue-400';
        case 'inprogress': return 'border-t-amber-400';
        case 'review': return 'border-t-purple-400';
        case 'done': return 'border-t-emerald-400';
        default: return 'border-t-slate-400';
    }
};

const Column: React.FC<ColumnProps> = ({ column, tasks, onAddTask, onEditTask, onDeleteTask, selectedTaskIds, onSelectTask }) => {
    return (
        <div className={`flex flex-col w-80 h-full max-h-full flex-shrink-0 glass rounded-3xl overflow-hidden border-t-4 ${getColumnColor(column.id)}`}>
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-black/5 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
                        {column.title}
                    </h2>
                    <span className={`
                        text-[10px] font-black px-2 py-0.5 rounded-lg transition-colors
                        ${column.wipLimit && tasks.length > column.wipLimit
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'}
                    `}>
                        {tasks.length}{column.wipLimit ? ` / ${column.wipLimit}` : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onAddTask}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                        title="Add Task"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all">
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Scrollable Task Area */}
            <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                    <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`
                            flex-1 overflow-y-auto overflow-x-hidden p-3 custom-scrollbar transition-colors duration-200
                            ${snapshot.isDraggingOver ? 'bg-blue-500/5' : 'bg-transparent'}
                        `}
                    >
                        <div className="flex flex-col gap-3">
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
                        </div>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </div>
    );
};

export default React.memo(Column);
