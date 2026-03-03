import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import { 
    ChevronLeft, 
    Hash, 
    Clock, 
    AlertCircle, 
    Trash2, 
    Archive,
    Edit3,
    CheckCircle2,
    Circle,
    MessageSquare,
    CheckSquare,
    Plus,
    X,
    UserPlus,
    Settings,
    History,
    MessageCircle,
    User as UserIcon,
    ArrowUpCircle,
    Tag as TagIcon,
    Send
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Task, Priority, Comment, Activity, ActivityType, User } from '../types';

const TaskViewer: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { state, dispatch } = useKanban();
    const { users } = useUsers();
    const { user } = useAuth();
    const navigate = useNavigate();

    const task = taskId ? state.tasks[taskId] : null;

    // UI States
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showLabelMenu, setShowLabelMenu] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [commentInput, setCommentInput] = useState('');

    // Refs for click-outside
    const assigneeRef = useRef<HTMLDivElement>(null);
    const priorityRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (assigneeRef.current && !assigneeRef.current.contains(event.target as Node)) {
                setShowAssigneeMenu(false);
            }
            if (priorityRef.current && !priorityRef.current.contains(event.target as Node)) {
                setShowPriorityMenu(false);
            }
            if (labelRef.current && !labelRef.current.contains(event.target as Node)) {
                setShowLabelMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!task) {
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

    const column = Object.values(state.columns).find(col => col.taskIds.includes(task.id));
    const assignee = users.find(u => u.id === task.assigneeId);

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this task?')) {
            if (column) {
                dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id, columnId: column.id } });
                navigate('/');
            }
        }
    };

    const handleArchive = () => {
        dispatch({ 
            type: 'UPDATE_TASK', 
            payload: { task: { ...task, isArchived: true } } 
        });
        navigate('/');
    };

    const toggleChecklistItem = (checklistId: string, itemId: string) => {
        const updatedChecklists = task.checklists?.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: cl.items.map(item => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item)
                };
            }
            return cl;
        });

        dispatch({
            type: 'UPDATE_TASK',
            payload: { task: { ...task, checklists: updatedChecklists } }
        });
    };

    const updateAssignee = (userId: string | undefined) => {
        dispatch({ 
            type: 'UPDATE_TASK', 
            payload: { 
                task: { 
                    ...task, 
                    assigneeId: userId
                } 
            } 
        });
        setShowAssigneeMenu(false);
    };

    const updatePriority = (newPriority: Priority) => {
        if (newPriority === task.priority) return;
        dispatch({ 
            type: 'UPDATE_TASK', 
            payload: { 
                task: { 
                    ...task, 
                    priority: newPriority
                } 
            } 
        });
        setShowPriorityMenu(false);
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            if (!task.tags.includes(tagInput.trim())) {
                const newTags = [...task.tags, tagInput.trim()];
                dispatch({ 
                    type: 'UPDATE_TASK', 
                    payload: { 
                        task: { 
                            ...task, 
                            tags: newTags
                        } 
                    } 
                });
            }
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        const newTags = task.tags.filter(t => t !== tag);
        dispatch({ 
            type: 'UPDATE_TASK', 
            payload: { 
                task: { 
                    ...task, 
                    tags: newTags
                } 
            } 
        });
    };

    const handleAddComment = () => {
        if (!commentInput.trim()) return;

        const commentId = uuidv4();
        const newComment: Comment = {
            id: commentId,
            taskId: task.id,
            userId: user?.id || 'anonymous',
            content: commentInput.trim(),
            createdAt: new Date().toISOString()
        };

        // Note: Backend will log the activity for this comment
        const activity: Activity = {
            id: uuidv4(),
            taskId: task.id,
            userId: user?.id || 'anonymous',
            type: 'comment',
            details: { text: commentInput.trim() },
            createdAt: new Date().toISOString()
        };

        dispatch({ 
            type: 'ADD_COMMENT', 
            payload: { 
                taskId: task.id, 
                comment: newComment, 
                activity 
            } 
        });
        setCommentInput('');
    };

    // Merge activities and comments for timeline, filtering out redundant comment activities
    const timelineItems = [
        ...(task.activities || []).filter(a => a.type !== 'comment'),
        ...(task.comments || []).map(c => ({ ...c, type: 'comment' as ActivityType }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const getInitials = (userId: string) => {
        const u = users.find(user => user.id === userId);
        if (u) return u.name?.[0] || u.email[0].toUpperCase();
        return '?';
    };

    const getUserName = (userId: string) => {
        const u = users.find(user => user.id === userId);
        return u?.name || u?.email.split('@')[0] || 'Unknown User';
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

                    <button 
                        onClick={() => navigate(`/tasks/${task.id}/edit`)}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-accent-blue transition-all text-sm"
                    >
                        <Edit3 className="w-4 h-4" />
                        Edit Task
                    </button>
                </nav>

                <div className="mb-8 border-b border-slate-200 dark:border-white/5 pb-8">
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
                        {task.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 font-medium">
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {column?.title || 'Open'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Hash className="w-4 h-4 text-slate-400" />
                            <span className="font-mono">{task.id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <span>opened {new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    {/* Left Column - Content Area */}
                    <div className="lg:col-span-8 space-y-12">
                        {/* Description Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">
                                <MessageSquare className="w-4 h-4" />
                                Description
                            </div>
                            <div className="prose prose-slate dark:prose-invert max-w-none glass p-8 rounded-3xl border border-white/10">
                                {task.description ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {task.description}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic">No description provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Checklists Section */}
                        {task.checklists && task.checklists.length > 0 && (
                            <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                    <CheckSquare className="w-4 h-4 text-accent-blue" />
                                    Checklists
                                </h3>
                                
                                <div className="space-y-6">
                                    {task.checklists.map((cl) => (
                                        <div key={cl.id} className="glass rounded-3xl border border-white/5 overflow-hidden">
                                            <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-bold text-slate-700 dark:text-slate-200">{cl.title}</h4>
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                        {cl.items.filter(i => i.isCompleted).length} / {cl.items.length} COMPLETED
                                                    </span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-3">
                                                    <div 
                                                        className="h-full bg-accent-blue transition-all duration-500"
                                                        style={{ width: `${cl.items.length > 0 ? (cl.items.filter(i => i.isCompleted).length / cl.items.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-6 space-y-3">
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Activity & Comments Section */}
                        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <History className="w-4 h-4 text-accent-blue" />
                                Activity
                            </h3>

                            <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
                                {timelineItems.map((item: any) => {
                                    const isComment = item.content !== undefined;
                                    const activity = item as Activity;
                                    const comment = item as Comment;

                                    return (
                                        <div key={item.id} className="relative pl-12">
                                            {/* Icon/Avatar */}
                                            <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center z-10 overflow-hidden">
                                                {isComment ? (
                                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                                        {getInitials(comment.userId)}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-400">
                                                        {activity.type === 'status_change' && <AlertCircle className="w-4 h-4" />}
                                                        {activity.type === 'priority_change' && <ArrowUpCircle className="w-4 h-4" />}
                                                        {activity.type === 'assignee_change' && <UserIcon className="w-4 h-4" />}
                                                        {activity.type === 'tag_change' && <TagIcon className="w-4 h-4" />}
                                                        {activity.type === 'task_created' && <Plus className="w-4 h-4" />}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content */}
                                            <div className={isComment ? "glass p-6 rounded-2xl border border-white/10" : ""}>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-xs font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                                        {getUserName(item.userId)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(item.createdAt).toLocaleString()}
                                                    </span>
                                                </div>

                                                {isComment ? (
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none mt-2">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {comment.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-slate-500 font-medium italic">
                                                        {activity.type === 'task_created' && 'created this task'}
                                                        {activity.type === 'priority_change' && (
                                                            <>changed priority from <span className="font-bold text-slate-400">{activity.details?.from}</span> to <span className="font-bold text-accent-blue">{activity.details?.to}</span></>
                                                        )}
                                                        {activity.type === 'assignee_change' && (
                                                            <>changed assignee from <span className="font-bold text-slate-400">{getUserName(activity.details?.from)}</span> to <span className="font-bold text-accent-blue">{getUserName(activity.details?.to)}</span></>
                                                        )}
                                                        {activity.type === 'tag_change' && activity.details?.text}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* New Comment Input */}
                            <div className="mt-12 pl-12 relative">
                                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-blue-500 border border-blue-600 flex items-center justify-center text-white font-bold text-xs z-10">
                                    {user ? getInitials(user.id) : '?'}
                                </div>
                                <div className="glass p-6 rounded-3xl border border-white/10 space-y-4 focus-within:ring-2 focus-within:ring-accent-blue/30 transition-all duration-300">
                                    <textarea 
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="Add a comment... (Markdown supported)"
                                        className="w-full bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 outline-none resize-none min-h-[100px]"
                                    />
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleAddComment}
                                            disabled={!commentInput.trim()}
                                            className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs disabled:opacity-50"
                                        >
                                            <Send className="w-3 h-3" />
                                            Comment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <aside className="lg:col-span-4 space-y-8 sticky top-8">
                        {/* Assignee Section */}
                        <div className="sidebar-section relative" ref={assigneeRef}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Assignee</h3>
                                <button onClick={() => setShowAssigneeMenu(!showAssigneeMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            {assignee ? (
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowAssigneeMenu(true)}>
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                        {assignee.name?.[0] || assignee.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{assignee.name || assignee.email.split('@')[0]}</p>
                                        <p className="text-[10px] text-slate-500">Click to change</p>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowAssigneeMenu(true)}
                                    className="flex items-center gap-3 text-slate-400 hover:text-accent-blue transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-accent-blue">
                                        <UserPlus className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-medium italic">Assign someone</span>
                                </button>
                            )}

                            <AnimatePresence>
                                {showAssigneeMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                                    >
                                        <div className="p-1">
                                            <button 
                                                onClick={() => updateAssignee(undefined)}
                                                className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold text-slate-400 italic transition-all"
                                            >
                                                Clear assignee
                                            </button>
                                            {users.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => updateAssignee(u.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all group"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                        {u.name?.[0] || u.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent-blue transition-colors">{u.name || u.email.split('@')[0]}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="h-px bg-slate-200 dark:bg-white/5" />

                        {/* Priority Section */}
                        <div className="sidebar-section relative" ref={priorityRef}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Priority</h3>
                                <button onClick={() => setShowPriorityMenu(!showPriorityMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                task.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                                {task.priority}
                            </button>

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
                                                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
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
                        <div className="sidebar-section relative" ref={labelRef}>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Labels</h3>
                                <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {task.tags && task.tags.length > 0 ? (
                                    task.tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-xs font-medium italic text-slate-400 px-1">No labels</p>
                                )}
                            </div>

                            <AnimatePresence>
                                {showLabelMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-2xl shadow-2xl z-50 p-3"
                                    >
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Add Label</span>
                                            <button onClick={() => setShowLabelMenu(false)} className="text-slate-400 hover:text-white">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Add a tag..."
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-accent-blue"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="pt-8 space-y-4">
                            <button
                                onClick={handleArchive}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-500/10 transition-all border border-transparent hover:border-slate-500/20"
                            >
                                <Archive className="w-4 h-4" />
                                Archive Task
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50/10 dark:hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Task
                            </button>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default TaskViewer;
