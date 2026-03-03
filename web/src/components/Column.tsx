import React, { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Column as ColumnType, Task } from '../types';
import TaskCard from './TaskCard';
import { Plus, MoreHorizontal, Trash2, Edit2, AlertCircle, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

interface ColumnProps {
    column: ColumnType;
    tasks: Task[];
    index: number;
    onAddTask: () => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (taskId: string) => void;
    onDeleteColumn: () => void;
    onUpdateColumn: (column: ColumnType) => void;
    selectedTaskIds: string[];
    onSelectTask: (taskId: string, multiSelect: boolean) => void;
}

const Column: React.FC<ColumnProps> = ({ 
    column, 
    tasks, 
    index, 
    onAddTask, 
    onEditTask, 
    onDeleteTask, 
    onDeleteColumn,
    onUpdateColumn,
    selectedTaskIds,
    onSelectTask
}) => {
    const [showOptions, setShowOptions] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isEditingWipLimit, setIsEditingWipLimit] = useState(false);
    const [editedTitle, setEditedTitle] = useState(column.title);
    const [editedWipLimit, setEditedWipLimit] = useState(column.wipLimit?.toString() || '');
    const titleInputRef = useRef<HTMLInputElement>(null);
    const wipInputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isEditingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [isEditingTitle]);

    useEffect(() => {
        if (isEditingWipLimit && wipInputRef.current) {
            wipInputRef.current.focus();
            wipInputRef.current.select();
        }
    }, [isEditingWipLimit]);

    const handleSaveTitle = () => {
        if (editedTitle.trim() && editedTitle !== column.title) {
            onUpdateColumn({ ...column, title: editedTitle.trim() });
        } else {
            setEditedTitle(column.title);
        }
        setIsEditingTitle(false);
    };

    const handleSaveWipLimit = () => {
        const val = editedWipLimit.trim();
        const newLimit = val === '' ? undefined : parseInt(val);
        if (newLimit !== column.wipLimit) {
            onUpdateColumn({ ...column, wipLimit: newLimit });
        }
        setIsEditingWipLimit(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent, type: 'title' | 'wip') => {
        if (e.key === 'Enter') {
            if (type === 'title') handleSaveTitle();
            else handleSaveWipLimit();
        }
        if (e.key === 'Escape') {
            if (type === 'title') {
                setEditedTitle(column.title);
                setIsEditingTitle(false);
            } else {
                setEditedWipLimit(column.wipLimit?.toString() || '');
                setIsEditingWipLimit(false);
            }
        }
    };

    return (
        <Draggable draggableId={column.id} index={index}>
            {(provided, snapshot) => {
                const child = (
                    <div
                        {...provided.draggableProps}
                        ref={provided.innerRef}
                        className={`flex flex-col w-80 flex-shrink-0 h-full max-h-full transition-all duration-300 group/column ${snapshot.isDragging ? 'z-[1000]' : ''}`}
                    >
                        <div className={`flex flex-col h-full glass rounded-[2.5rem] border border-white/10 dark:border-white/5 bg-white/5 shadow-2xl overflow-hidden ${snapshot.isDragging ? 'shadow-accent-blue/20 border-accent-blue/30 ring-2 ring-accent-blue/20' : ''}`}>
                            {/* Column Header */}
                            <header 
                                {...provided.dragHandleProps}
                                className="p-6 pb-2 flex items-center justify-between cursor-grab active:cursor-grabbing"
                            >
                                <div className="flex items-center gap-3 overflow-hidden flex-1">
                                    <div className="w-2 h-2 rounded-full bg-accent-blue shadow-[0_0_8px_rgba(37,99,235,0.6)] flex-shrink-0" />
                                    {isEditingTitle ? (
                                        <input
                                            ref={titleInputRef}
                                            value={editedTitle}
                                            onChange={(e) => setEditedTitle(e.target.value)}
                                            onBlur={handleSaveTitle}
                                            onKeyDown={(e) => handleKeyDown(e, 'title')}
                                            className="bg-slate-900/50 border border-accent-blue/50 rounded-lg px-2 py-0.5 text-xs font-black text-white uppercase tracking-[0.15em] outline-none w-full"
                                        />
                                    ) : (
                                        <h2 
                                            onDoubleClick={() => setIsEditingTitle(true)}
                                            className="font-black text-slate-900 dark:text-white uppercase tracking-[0.15em] text-xs truncate cursor-text"
                                        >
                                            {column.title}
                                        </h2>
                                    )}
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-black flex-shrink-0">
                                        {tasks.length}
                                    </span>
                                </div>
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setShowOptions(!showOptions)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                                    >
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>

                                    <AnimatePresence>
                                        {showOptions && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                className="absolute right-0 mt-2 w-52 glass border border-white/10 rounded-2xl shadow-2xl z-50 p-2 overflow-hidden"
                                            >
                                                <button 
                                                    onClick={() => { setShowOptions(false); setIsEditingTitle(true); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                    Rename Column
                                                </button>
                                                <button 
                                                    onClick={() => { setShowOptions(false); setIsEditingWipLimit(true); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                                                >
                                                    <Settings2 className="w-4 h-4" />
                                                    Edit WIP Limit
                                                </button>
                                                <div className="h-[1px] bg-white/10 my-1 mx-2" />
                                                <button 
                                                    onClick={() => { setShowOptions(false); onDeleteColumn(); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/10 text-red-500 rounded-xl transition-all text-xs font-bold uppercase tracking-widest"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete Column
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </header>

                            {/* WIP Limit Indicator */}
                            <div className="px-6 mb-2">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">WIP Limit</span>
                                    {isEditingWipLimit ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                ref={wipInputRef}
                                                type="number"
                                                min="0"
                                                value={editedWipLimit}
                                                onChange={(e) => setEditedWipLimit(e.target.value)}
                                                onBlur={handleSaveWipLimit}
                                                onKeyDown={(e) => handleKeyDown(e, 'wip')}
                                                placeholder="None"
                                                className="bg-slate-900/50 border border-accent-blue/50 rounded px-1 py-0 text-[9px] font-bold text-white outline-none w-12"
                                            />
                                        </div>
                                    ) : (
                                        <span 
                                            onDoubleClick={() => setIsEditingWipLimit(true)}
                                            className={`text-[9px] font-bold uppercase tracking-widest cursor-text ${column.wipLimit && tasks.length > column.wipLimit ? 'text-red-500' : 'text-slate-400'}`}
                                        >
                                            {column.wipLimit ? `${tasks.length} / ${column.wipLimit}` : 'Not set'}
                                        </span>
                                    )}
                                </div>
                                {column.wipLimit && (
                                    <>
                                        <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all duration-500 ${tasks.length > column.wipLimit ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-accent-blue'}`}
                                                style={{ width: `${Math.min((tasks.length / column.wipLimit) * 100, 100)}%` }}
                                            />
                                        </div>
                                        {tasks.length > column.wipLimit && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-[9px] text-red-500 font-bold mt-1 flex items-center gap-1 uppercase tracking-tighter"
                                            >
                                                <AlertCircle className="w-3 h-3" /> WIP limit exceeded!
                                            </motion.p>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Tasks Container */}
                            <Droppable droppableId={column.id} type="TASK">
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex-1 overflow-y-auto custom-scrollbar p-4 transition-colors duration-300 min-h-[100px] ${
                                            snapshot.isDraggingOver ? 'bg-accent-blue/5' : ''
                                        }`}
                                    >
                                        <div className="space-y-4 pb-20">
                                            {tasks.map((task, index) => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    index={index}
                                                    onClick={() => navigate(`/tasks/${task.id}`)}
                                                    onDelete={() => onDeleteTask(task.id)}
                                                    isSelected={selectedTaskIds.includes(task.id)}
                                                    onSelect={(multi) => onSelectTask(task.id, multi)}
                                                />
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>

                            {/* Add Task Button (Floating at bottom of column) */}
                            <div className="p-6 pt-2 mt-auto">
                                <button
                                    onClick={() => navigate(`/tasks/new?columnId=${column.id}`)}
                                    className="w-full group/add bg-white/5 hover:bg-accent-blue border-2 border-dashed border-white/10 hover:border-accent-blue rounded-3xl py-4 flex items-center justify-center gap-3 transition-all duration-300"
                                >
                                    <div className="p-1.5 bg-slate-200 dark:bg-slate-800 group-hover/add:bg-white/20 rounded-xl transition-all">
                                        <Plus className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover/add:text-white" />
                                    </div>
                                    <span className="font-bold text-slate-500 dark:text-slate-400 group-hover/add:text-white uppercase tracking-widest text-[10px]">
                                        Add Task
                                    </span>
                                </button>
                            </div>
                        </div>
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
