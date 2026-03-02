import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { Task, Priority, User, Checklist, SubTask } from '../types';
import api from '../lib/api';
import { 
    ChevronLeft, 
    MessageSquare, 
    Hash, 
    Clock, 
    AlertCircle, 
    Trash2, 
    Tag,
    ChevronDown,
    UserPlus,
    Plus,
    CheckCircle2,
    Circle,
    ChevronRight,
    Settings,
    X,
    Library,
    Sparkles,
    Archive
} from 'lucide-react';
import TaskEditor from './TaskEditor';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { CHECKLIST_TEMPLATES } from '../lib/templates';

const TaskDetailView: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { state, dispatch } = useKanban();
    const { users } = useUsers();
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine if we are in creation mode
    const isNewTask = !taskId || taskId === 'new' || location.pathname === '/tasks/new';
    const queryParams = new URLSearchParams(location.search);
    const initialColumnId = queryParams.get('columnId') || state.columnOrder[0] || 'todo';

    const task = (!isNewTask && taskId) ? state.tasks[taskId] : null;
    
    // Local Draft State
    const [draftTitle, setDraftTitle] = useState('');
    const [draftDescription, setDraftDescription] = useState('');
    const [draftChecklists, setDraftChecklists] = useState<Checklist[]>([]);
    const [draftPriority, setDraftPriority] = useState<Priority>('medium');
    const [draftTags, setDraftTags] = useState<string[]>([]);
    const [draftAssigneeId, setDraftAssigneeId] = useState<string | undefined>(undefined);
    const [isDirty, setIsDirty] = useState(false);

    // Sidebar States
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showLabelMenu, setShowLabelMenu] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Checklist UI States
    const [expandedChecklists, setExpandedChecklists] = useState<Record<string, boolean>>({});
    const [showTemplates, setShowTemplates] = useState(false);
    const [newChecklistTitle, setNewChecklistTitle] = useState('');

    useEffect(() => {
        if (task) {
            setDraftTitle(task.title);
            setDraftDescription(task.description);
            setDraftChecklists(task.checklists || []);
            setDraftPriority(task.priority);
            setDraftTags(task.tags || []);
            setDraftAssigneeId(task.assigneeId);
        } else if (isNewTask) {
            setDraftTitle('');
            setDraftDescription('');
            setDraftChecklists([]);
            setDraftPriority('medium');
            setDraftTags([]);
            setDraftAssigneeId(undefined);
        }
    }, [task, isNewTask]);

    useEffect(() => {
        if (isNewTask) {
            setIsDirty(draftTitle.trim().length > 0 || draftDescription.trim().length > 0 || draftChecklists.length > 0);
            return;
        }
        if (!task) return;
        
        const checklistsChanged = JSON.stringify(draftChecklists) !== JSON.stringify(task.checklists || []);
        const tagsChanged = JSON.stringify(draftTags) !== JSON.stringify(task.tags || []);
        
        setIsDirty(
            draftTitle !== task.title || 
            draftDescription !== task.description || 
            draftPriority !== task.priority ||
            draftAssigneeId !== task.assigneeId ||
            tagsChanged ||
            checklistsChanged
        );
    }, [draftTitle, draftDescription, draftChecklists, draftPriority, draftTags, draftAssigneeId, task, isNewTask]);

    if (!task && !isNewTask) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-8">
                <div className="text-center">
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Task not found</h1>
                    <button 
                        onClick={() => navigate('/')}
                        className="text-accent-blue hover:underline flex items-center gap-2 mx-auto"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Back to board
                    </button>
                </div>
            </div>
        );
    }

    const column = task ? Object.values(state.columns).find(col => col.taskIds.includes(task.id)) : null;
    const assignee = users.find(u => u.id === draftAssigneeId);

    const handleSave = async () => {
        if (!draftTitle.trim()) return;
        
        if (isNewTask) {
            const newTaskId = uuidv4();
            const newTask: Task = {
                id: newTaskId,
                title: draftTitle,
                description: draftDescription,
                priority: draftPriority,
                tags: draftTags,
                assigneeId: draftAssigneeId,
                subTasks: [],
                checklists: draftChecklists,
                createdAt: new Date().toISOString(),
            };

            await dispatch({ type: 'ADD_TASK', payload: { columnId: initialColumnId, task: newTask } });
            navigate(`/tasks/${newTaskId}`);
            showToast('Task created successfully', 'success');
        } else if (task) {
            const updatedTask: Task = {
                ...task,
                title: draftTitle,
                description: draftDescription,
                priority: draftPriority,
                tags: draftTags,
                assigneeId: draftAssigneeId,
                checklists: draftChecklists
            };

            dispatch({ type: 'UPDATE_TASK', payload: { task: updatedTask } });
            setIsDirty(false);
            showToast('Changes saved', 'success');
        }
    };

    const updateAssignee = (userId: string | undefined) => {
        setDraftAssigneeId(userId);
        setShowAssigneeMenu(false);
    };

    const updatePriority = (newPriority: Priority) => {
        setDraftPriority(newPriority);
        setShowPriorityMenu(false);
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!draftTags.includes(tagInput.trim())) {
                setDraftTags([...draftTags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setDraftTags(draftTags.filter(t => t !== tag));
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            if (task && column) {
                dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id, columnId: column.id } });
                navigate('/');
                showToast('Task deleted', 'info');
            }
        }
    };

    const handleArchive = () => {
        if (task) {
            dispatch({ 
                type: 'UPDATE_TASK', 
                payload: { task: { ...task, isArchived: true } } 
            });
            navigate('/');
            showToast('Task archived', 'info');
        }
    };

    // Checklist Logic
    const addChecklist = () => {
        if (!newChecklistTitle.trim()) return;
        const newList: Checklist = {
            id: uuidv4(),
            title: newChecklistTitle.trim(),
            taskId: task?.id || 'new',
            items: []
        };
        setDraftChecklists([...draftChecklists, newList]);
        setNewChecklistTitle('');
        setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
    };

    const toggleChecklistItem = (checklistId: string, itemId: string) => {
        setDraftChecklists(draftChecklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: cl.items.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item)
                };
            }
            return cl;
        }));
    };

    const addChecklistItem = (checklistId: string, title: string) => {
        if (!title.trim()) return;
        setDraftChecklists(draftChecklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: [...cl.items, { id: uuidv4(), title, isCompleted: false, checklistId }]
                };
            }
            return cl;
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation & Action Bar */}
                <nav className="mb-8 flex items-center justify-between">
                    <button 
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 text-slate-500 hover:text-accent-blue transition-colors font-bold text-sm uppercase tracking-widest"
                    >
                        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        Back to Board
                    </button>

                    <AnimatePresence>
                        {isDirty && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-3"
                            >
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Unsaved Changes</span>
                                <button 
                                    onClick={() => {
                                        if (task) {
                                            setDraftTitle(task.title);
                                            setDraftDescription(task.description);
                                            setDraftChecklists(task.checklists || []);
                                            setDraftPriority(task.priority);
                                            setDraftTags(task.tags || []);
                                            setDraftAssigneeId(task.assigneeId);
                                        } else {
                                            setDraftTitle('');
                                            setDraftDescription('');
                                            setDraftChecklists([]);
                                            setDraftPriority('medium');
                                            setDraftTags([]);
                                            setDraftAssigneeId(undefined);
                                        }
                                    }}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                                >
                                    Discard
                                </button>
                                <button 
                                    onClick={handleSave}
                                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all"
                                >
                                    {isNewTask ? 'Create Task' : 'Save Changes'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </nav>

                <div className="mb-8 border-b border-slate-200 dark:border-white/5 pb-8">
                    <textarea
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        className="w-full bg-transparent border-none text-3xl sm:text-4xl font-black text-slate-900 dark:text-white focus:ring-0 resize-none p-0 placeholder:text-slate-300 dark:placeholder:text-slate-800"
                        placeholder="Task Title"
                        rows={1}
                    />
                    
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {isNewTask ? (state.columns[initialColumnId]?.title || 'New') : (column?.title || 'Open')}
                        </div>
                        {!isNewTask && task && (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    <span className="font-mono">{task.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>opened {new Date(task.createdAt).toLocaleDateString()}</span>
                                </div>
                            </>
                        )}
                        {isNewTask && (
                            <div className="text-xs font-bold text-accent-blue uppercase tracking-widest italic">
                                Draft Mode
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column - Content Area */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Editor Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                                <MessageSquare className="w-4 h-4" />
                                Description
                            </div>
                            <TaskEditor 
                                value={draftDescription}
                                onChange={setDraftDescription}
                            />
                        </div>

                        {/* Checklists Section */}
                        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Checklists</h3>
                                    <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-500">
                                        {draftChecklists.length}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setShowTemplates(!showTemplates)}
                                            className="p-2 text-slate-400 hover:text-accent-blue transition-colors"
                                            title="Templates"
                                        >
                                            <Library className="w-5 h-5" />
                                        </button>
                                        <AnimatePresence>
                                            {showTemplates && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                                    className="absolute right-0 mt-2 w-56 glass border border-white/10 rounded-2xl shadow-2xl z-50 p-2"
                                                >
                                                    <div className="px-3 py-2 border-b border-white/5 mb-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                            <Sparkles className="w-3 h-3 text-accent-blue" />
                                                            Checklist Templates
                                                        </span>
                                                    </div>
                                                    {CHECKLIST_TEMPLATES.map(t => (
                                                        <button
                                                            key={t.title}
                                                            onClick={() => {
                                                                const newList: Checklist = {
                                                                    id: uuidv4(),
                                                                    title: t.title,
                                                                    taskId: task?.id || 'new',
                                                                    items: t.items.map(item => ({ id: uuidv4(), title: item, isCompleted: false }))
                                                                };
                                                                setDraftChecklists([...draftChecklists, newList]);
                                                                setShowTemplates(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 hover:bg-white/5 rounded-xl transition-all group"
                                                        >
                                                            <p className="text-xs font-bold text-slate-200 group-hover:text-accent-blue">{t.title}</p>
                                                            <p className="text-[10px] text-slate-500">{t.items.length} items</p>
                                                        </button>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="text"
                                            value={newChecklistTitle}
                                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addChecklist()}
                                            placeholder="Add a checklist..."
                                            className="bg-transparent border border-slate-200 dark:border-white/5 rounded-xl px-4 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent-blue w-40"
                                        />
                                        <button 
                                            onClick={addChecklist}
                                            className="p-1.5 bg-accent-blue text-white rounded-lg hover:shadow-lg hover:shadow-accent-blue/20 transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {draftChecklists.map((cl) => (
                                    <div key={cl.id} className="glass rounded-3xl border border-white/5 overflow-hidden">
                                        <div 
                                            className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                            onClick={() => setExpandedChecklists(prev => ({ ...prev, [cl.id]: !prev[cl.id] }))}
                                        >
                                            <div className="flex items-center gap-3">
                                                {expandedChecklists[cl.id] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                                                <h4 className="font-bold text-slate-700 dark:text-slate-200">{cl.title}</h4>
                                                <div className="h-1.5 w-32 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ml-4">
                                                    <div 
                                                        className="h-full bg-accent-blue transition-all duration-500"
                                                        style={{ width: `${cl.items.length > 0 ? (cl.items.filter(i => i.isCompleted).length / cl.items.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setDraftChecklists(draftChecklists.filter(d => d.id !== cl.id)); }}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {expandedChecklists[cl.id] && (
                                                <motion.div 
                                                    initial={{ height: 0 }}
                                                    animate={{ height: 'auto' }}
                                                    exit={{ height: 0 }}
                                                    className="overflow-hidden bg-slate-50/50 dark:bg-black/20"
                                                >
                                                    <div className="px-14 pb-6 pt-2 space-y-3">
                                                        {cl.items.map(item => (
                                                            <div key={item.id} className="flex items-center gap-4 group">
                                                                <button onClick={() => toggleChecklistItem(cl.id, item.id)}>
                                                                    {item.isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />}
                                                                </button>
                                                                <span className={`text-sm flex-1 ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                    {item.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        <input 
                                                            type="text"
                                                            placeholder="Add an item..."
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    addChecklistItem(cl.id, (e.target as HTMLInputElement).value);
                                                                    (e.target as HTMLInputElement).value = '';
                                                                }
                                                            }}
                                                            className="w-full bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 mt-2"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <aside className="lg:col-span-4 space-y-6 sticky top-8">
                        {/* Assignee Selection */}
                        <div className="sidebar-section relative">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Assignees</h3>
                                <button onClick={() => setShowAssigneeMenu(!showAssigneeMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {assignee ? (
                                    <div className="flex items-center gap-2 group cursor-pointer">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                            {assignee.name?.[0] || assignee.email[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{assignee.name || assignee.email.split('@')[0]}</span>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setShowAssigneeMenu(true)}
                                        className="flex items-center gap-2 text-slate-400 hover:text-accent-blue transition-colors group"
                                    >
                                        <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-accent-blue">
                                            <UserPlus className="w-3 h-3" />
                                        </div>
                                        <span className="text-xs font-medium italic">No assignee</span>
                                    </button>
                                )}
                            </div>

                            <AnimatePresence>
                                {showAssigneeMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                    >
                                        <div className="p-3 border-b border-white/5 flex justify-between items-center">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Assign someone</span>
                                            <button onClick={() => setShowAssigneeMenu(false)}><X className="w-3 h-3" /></button>
                                        </div>
                                        <div className="p-1">
                                            <button 
                                                onClick={() => updateAssignee(undefined)}
                                                className="w-full flex items-center px-3 py-2 hover:bg-white/5 rounded-xl text-xs font-bold text-slate-400 italic"
                                            >
                                                Clear assignee
                                            </button>
                                            {users.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => updateAssignee(user.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                        {user.name?.[0] || user.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-slate-200">{user.name || user.email.split('@')[0]}</p>
                                                        <p className="text-[10px] text-slate-500">{user.email}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-white/5" />

                        {/* Priority Selector */}
                        <div className="sidebar-section relative">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Priority</h3>
                                <button onClick={() => setShowPriorityMenu(!showPriorityMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                draftPriority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                draftPriority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                                {draftPriority}
                            </span>

                            <AnimatePresence>
                                {showPriorityMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-50 p-1"
                                    >
                                        {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => updatePriority(p)}
                                                className="w-full text-left px-4 py-2 hover:bg-white/5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-white/5" />

                        {/* Labels Section */}
                        <div className="sidebar-section relative">
                            <div className="flex items-center justify-between mb-2 px-1">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Labels</h3>
                                <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {draftTags.map(tag => (
                                    <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                        {tag}
                                        <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                    </span>
                                ))}
                            </div>

                            <AnimatePresence>
                                {showLabelMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-50 p-3"
                                    >
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Add a tag..."
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-accent-blue mb-2"
                                        />
                                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Press Enter to add</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="pt-8 space-y-3">
                            {!isNewTask && (
                                <>
                                    <button
                                        onClick={handleArchive}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-500/10 transition-all border border-transparent hover:border-slate-500/20"
                                    >
                                        <Archive className="w-4 h-4" />
                                        Archive Task
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Task
                                    </button>
                                </>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default TaskDetailView;
