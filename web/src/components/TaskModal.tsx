import React, { useState, useEffect } from 'react';
import { Task, Priority, SubTask } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Task) => void;
    initialTask?: Task;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, initialTask }) => {
    const [title, setTitle] = useState(initialTask?.title || '');
    const [description, setDescription] = useState(initialTask?.description || '');
    const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(initialTask?.tags || []);
    const [subTasks, setSubTasks] = useState<SubTask[]>(initialTask?.subTasks || []);
    const [subTaskInput, setSubTaskInput] = useState('');

    useEffect(() => {
        if (initialTask) {
            setTitle(initialTask.title);
            setDescription(initialTask.description);
            setPriority(initialTask.priority);
            setTags(initialTask.tags);
            setSubTasks(initialTask.subTasks);
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setTags([]);
            setSubTasks([]);
        }
    }, [initialTask, isOpen]);

    const handleSave = () => {
        if (!title.trim()) return;

        const task: Task = {
            id: initialTask?.id || uuidv4(),
            title,
            description,
            priority,
            tags,
            subTasks,
            createdAt: initialTask?.createdAt || new Date().toISOString(),
        };

        onSave(task);
        onClose();
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
            e.preventDefault();
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

    const addSubTask = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && subTaskInput.trim()) {
            const newSubTask: SubTask = {
                id: uuidv4(),
                title: subTaskInput.trim(),
                isCompleted: false,
            };
            setSubTasks([...subTasks, newSubTask]);
            setSubTaskInput('');
            e.preventDefault();
        }
    };

    const toggleSubTask = (id: string) => {
        setSubTasks(subTasks.map(st =>
            st.id === id ? { ...st, isCompleted: !st.isCompleted } : st
        ));
    };

    const removeSubTask = (id: string) => {
        setSubTasks(subTasks.filter(st => st.id !== id));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/10"
                    >
                        <div className="p-8">
                            <header className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                    {initialTask ? 'Edit Task' : 'New Task'}
                                </h2>
                                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </header>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Title</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="What needs to be done?"
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Add more details..."
                                        rows={4}
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Priority</label>
                                        <div className="flex gap-2">
                                            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                                                <button
                                                    key={p}
                                                    onClick={() => setPriority(p)}
                                                    className={`
                            flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all
                            ${priority === p
                                                            ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/40'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}
                          `}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Tags</label>
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {tags.map(tag => (
                                                <span key={tag} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1">
                                                    {tag}
                                                    <button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Press Enter"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                                        Sub-tasks ({subTasks.filter(st => st.isCompleted).length}/{subTasks.length})
                                    </label>
                                    <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                        {subTasks.map(st => (
                                            <div key={st.id} className="flex items-center gap-3 group">
                                                <input
                                                    type="checkbox"
                                                    checked={st.isCompleted}
                                                    onChange={() => toggleSubTask(st.id)}
                                                    className="w-4 h-4 rounded border-slate-300 text-accent-blue focus:ring-accent-blue pointer-events-auto"
                                                />
                                                <span className={`text-sm flex-1 ${st.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                    {st.title}
                                                </span>
                                                <button
                                                    onClick={() => removeSubTask(st.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        value={subTaskInput}
                                        onChange={(e) => setSubTaskInput(e.target.value)}
                                        onKeyDown={addSubTask}
                                        placeholder="Add a sub-task..."
                                        className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <footer className="mt-12 flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] bg-accent-blue text-white py-3 rounded-xl font-bold shadow-xl shadow-accent-blue/30 hover:shadow-accent-blue/50 active:scale-95 transition-all"
                                >
                                    Save Task
                                </button>
                            </footer>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TaskModal;
