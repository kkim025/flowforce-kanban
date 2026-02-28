import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task } from '../types';
import TaskCard from './TaskCard';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useKanban } from '../store/KanbanContext';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    index: number;
    onAddTask: () => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDeleteColumn: () => void;
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

const Column: React.FC<ColumnProps> = ({ column, tasks, index, onAddTask, onEditTask, onDeleteTask, onDeleteColumn, selectedTaskIds, onSelectTask }) => {
    const { dispatch } = useKanban();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleValue, setTitleValue] = useState(column.title);
    const editInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingTitle) {
            editInputRef.current?.focus();
            editInputRef.current?.select();
        }
    }, [isEditingTitle]);

    const handleTitleSave = () => {
        if (titleValue.trim() && titleValue !== column.title) {
            dispatch({
                type: 'UPDATE_COLUMN',
                payload: { column: { ...column, title: titleValue.trim() } }
            });
        } else {
            setTitleValue(column.title);
        }
        setIsEditingTitle(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleTitleSave();
        if (e.key === 'Escape') {
            setTitleValue(column.title);
            setIsEditingTitle(false);
        }
    };

    return (
        <Draggable draggableId={column.id} index={index}>
            {(provided, snapshot) => {
                const child = (
                    <div 
                        {...provided.draggableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col w-80 h-full max-h-full flex-shrink-0 glass shadow-sm rounded-3xl overflow-hidden border-t-4 ${getColumnColor(column.id)} ${snapshot.isDragging ? 'shadow-lg ring-2 ring-accent-blue/20' : ''}`}
                        style={provided.draggableProps.style}
                    >
                        {/* Sticky Header */}
                        <div 
                            {...provided.dragHandleProps}
                            className="flex items-center justify-between p-4 bg-white/5 dark:bg-black/5 backdrop-blur-sm z-10"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                                {isEditingTitle ? (
                                    <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
                                        <input
                                            ref={editInputRef}
                                            type="text"
                                            value={titleValue}
                                            onChange={e => setTitleValue(e.target.value)}
                                            onBlur={handleTitleSave}
                                            onKeyDown={handleKeyDown}
                                            className="w-full bg-white/10 dark:bg-black/20 border border-accent-blue/30 rounded px-2 py-0.5 text-[11px] font-black uppercase text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-accent-blue"
                                        />
                                    </div>
                                ) : (
                                    <h2 
                                        onClick={() => setIsEditingTitle(true)}
                                        className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-[11px] truncate cursor-text hover:text-accent-blue transition-colors"
                                    >
                                        {column.title}
                                    </h2>
                                )}
                                <span className={`
                                    text-[10px] font-black px-2 py-0.5 rounded-lg transition-colors flex-shrink-0
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
                                <button 
                                    onClick={onDeleteColumn}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                                    title="Delete Column"
                                >
                                    <Trash2 className="w-4 h-4" />
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

                if (snapshot.isDragging) {
                    return createPortal(child, document.body);
                }

                return child;
            }}
        </Draggable>
    );
};

export default React.memo(Column);
