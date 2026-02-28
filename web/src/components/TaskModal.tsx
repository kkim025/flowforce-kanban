import React, { useState, useEffect } from 'react';
import { Task, Priority, SubTask, Checklist } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, CheckCircle2, Circle, ListChecks, ChevronDown, ChevronRight, X, Library, Sparkles } from 'lucide-react';
import { CHECKLIST_TEMPLATES, ChecklistTemplate } from '../lib/templates';

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
    const [checklists, setChecklists] = useState<Checklist[]>(initialTask?.checklists || []);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');
    const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
    const [showTemplates, setShowTemplates] = useState(false);

    useEffect(() => {
        if (initialTask) {
            setTitle(initialTask.title);
            setDescription(initialTask.description);
            setPriority(initialTask.priority);
            setTags(initialTask.tags);
            setChecklists(initialTask.checklists || []);
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setTags([]);
            setChecklists([]);
        }
        setShowTemplates(false);
    }, [initialTask, isOpen]);

    const handleSave = () => {
        if (!title.trim()) return;

        const task: Task = {
            id: initialTask?.id || uuidv4(),
            title,
            description,
            priority,
            tags,
            subTasks: initialTask?.subTasks || [], 
            checklists,
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

    const addChecklist = () => {
        if (!newChecklistTitle.trim()) return;
        const newList: Checklist = {
            id: uuidv4(),
            title: newChecklistTitle.trim(),
            taskId: initialTask?.id || '',
            items: []
        };
        setChecklists([...checklists, newList]);
        setNewChecklistTitle('');
        setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
    };

    const applyTemplate = (template: ChecklistTemplate) => {
        const newListId = uuidv4();
        const newList: Checklist = {
            id: newListId,
            title: template.title,
            taskId: initialTask?.id || '',
            items: template.items.map(itemTitle => ({
                id: uuidv4(),
                title: itemTitle,
                isCompleted: false,
                checklistId: newListId
            }))
        };
        setChecklists([...checklists, newList]);
        setExpandedChecklists(prev => ({ ...prev, [newListId]: true }));
        setShowTemplates(false);
    };

    const deleteChecklist = (id: string) => {
        setChecklists(checklists.filter(cl => cl.id !== id));
    };

    const addChecklistItem = (checklistId: string, itemTitle: string) => {
        if (!itemTitle.trim()) return;
        setChecklists(checklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: [...cl.items, { id: uuidv4(), title: itemTitle.trim(), isCompleted: false, checklistId }]
                };
            }
            return cl;
        }));
    };

    const toggleChecklistItem = (checklistId: string, itemId: string) => {
        setChecklists(checklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: cl.items.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item)
                };
            }
            return cl;
        }));
    };

    const removeChecklistItem = (checklistId: string, itemId: string) => {
        setChecklists(checklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: cl.items.filter(item => item.id !== itemId)
                };
            }
            return cl;
        }));
    };

    const toggleExpand = (id: string) => {
        setExpandedChecklists(prev => ({ ...prev, [id]: !prev[id] }));
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
                        className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/10 max-h-[90vh] flex flex-col"
                    >
                        <div className="p-8 overflow-y-auto custom-scrollbar">
                            <header className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-accent-blue/10 rounded-xl">
                                        <ListChecks className="w-6 h-6 text-accent-blue" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                                        {initialTask ? 'Edit Task' : 'New Task'}
                                    </h2>
                                </div>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all">
                                    <X className="w-6 h-6" />
                                </button>
                            </header>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Title</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="What needs to be done?"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all text-lg font-semibold"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Add more details..."
                                            rows={4}
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-5 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all resize-none"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center relative">
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400">Checklists</label>
                                            <div className="flex gap-2">
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setShowTemplates(!showTemplates)}
                                                        className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tighter ${showTemplates ? 'bg-accent-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                                        title="Checklist Library"
                                                    >
                                                        <Library className="w-3.5 h-3.5" />
                                                        Templates
                                                    </button>
                                                    
                                                    <AnimatePresence>
                                                        {showTemplates && (
                                                            <motion.div 
                                                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                                className="absolute bottom-full right-0 mb-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-white/5 p-2 z-[60]"
                                                            >
                                                                <div className="px-3 py-2 border-b border-slate-50 dark:border-white/5 mb-1">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                                        <Sparkles className="w-3 h-3 text-accent-blue" />
                                                                        Checklist Library
                                                                    </span>
                                                                </div>
                                                                {CHECKLIST_TEMPLATES.map(t => (
                                                                    <button
                                                                        key={t.title}
                                                                        onClick={() => applyTemplate(t)}
                                                                        className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all group"
                                                                    >
                                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent-blue">{t.title}</p>
                                                                        <p className="text-[10px] text-slate-400">{t.items.length} items</p>
                                                                    </button>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>

                                                <input 
                                                    type="text"
                                                    value={newChecklistTitle}
                                                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                                                    placeholder="List title..."
                                                    className="bg-slate-50 dark:bg-slate-800/50 border-none rounded-lg px-3 py-1 text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-accent-blue w-32"
                                                />
                                                <button 
                                                    onClick={addChecklist}
                                                    className="p-1 bg-accent-blue text-white rounded-lg hover:bg-blue-600 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {checklists.map((cl) => (
                                                <div key={cl.id} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                                                    <div 
                                                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                                        onClick={() => toggleExpand(cl.id)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {expandedChecklists[cl.id] ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{cl.title}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md">
                                                                {cl.items.filter(i => i.isCompleted).length}/{cl.items.length}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); deleteChecklist(cl.id); }}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    <AnimatePresence>
                                                        {expandedChecklists[cl.id] && (
                                                            <motion.div 
                                                                initial={{ height: 0 }}
                                                                animate={{ height: 'auto' }}
                                                                exit={{ height: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="px-4 pb-4 pt-2 space-y-2">
                                                                    {cl.items.map(item => (
                                                                        <div key={item.id} className="flex items-center gap-3 group">
                                                                            <button 
                                                                                onClick={() => toggleChecklistItem(cl.id, item.id)}
                                                                                className="transition-transform active:scale-90"
                                                                            >
                                                                                {item.isCompleted 
                                                                                    ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 
                                                                                    : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                                                                                }
                                                                            </button>
                                                                            <span className={`text-sm flex-1 ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                                {item.title}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => removeChecklistItem(cl.id, item.id)}
                                                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </button>
                                                                        </div>
                                                                    ))}
                                                                    <div className="flex gap-2 mt-4">
                                                                        <input 
                                                                            type="text"
                                                                            placeholder="Add item..."
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') {
                                                                                    addChecklistItem(cl.id, (e.target as HTMLInputElement).value);
                                                                                    (e.target as HTMLInputElement).value = '';
                                                                                }
                                                                            }}
                                                                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-accent-blue/30"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Priority</label>
                                        <div className="flex flex-col gap-2">
                                            {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                                                const isSelected = priority === p;
                                                let activeClass = '';
                                                
                                                if (isSelected) {
                                                    switch (p) {
                                                        case 'high': activeClass = 'bg-red-500 text-white shadow-lg shadow-red-500/20'; break;
                                                        case 'medium': activeClass = 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'; break;
                                                        case 'low': activeClass = 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'; break;
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => setPriority(p)}
                                                        className={`
                                                            w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all scale-[1] hover:scale-[1.02] active:scale-[0.98]
                                                            ${isSelected
                                                                ? `${activeClass} scale-[1.02]`
                                                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                                        `}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Tags</label>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {tags.map(tag => (
                                                <span key={tag} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-white/5">
                                                    #{tag}
                                                    <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Add tag and press Enter"
                                            className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl px-4 py-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-accent-blue outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <footer className="mt-12 pt-8 border-t border-slate-100 dark:border-white/5 flex gap-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] bg-accent-blue text-white py-4 rounded-2xl font-black shadow-2xl shadow-accent-blue/40 hover:shadow-accent-blue/60 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
                                >
                                    Save Changes
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
