import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import { 
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
    User as UserIcon,
    ArrowUpCircle,
    Tag as TagIcon,
    Send
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { Task, Priority, Comment, Activity, ActivityType } from '../types';

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
            <div className="p-12 flex flex-col items-center justify-center h-full">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Task not found</h1>
                <button 
                    onClick={() => navigate('/')}
                    className="text-accent-blue hover:underline font-bold text-sm uppercase tracking-widest"
                >
                    Back to board
                </button>
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

    // Correctly typed timeline item union
    type TimelineItem = (Activity | (Comment & { type: 'comment' }));

    const timelineItems: TimelineItem[] = [
        ...(task.activities || []).filter(a => a.type !== 'comment'),
        ...(task.comments || []).map(c => ({ ...c, type: 'comment' as const }))
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const getInitials = (userId: string) => {
        const u = users.find(user => user.id === userId);
        if (u) return u.name?.[0] || u.email[0].toUpperCase();
        return '?';
    };

    const getUserName = (userId: string | null | undefined) => {
        if (!userId) return 'Unknown User';
        const u = users.find(user => user.id === userId);
        return u?.name || u?.email.split('@')[0] || 'Unknown User';
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Action Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                    {task.id.slice(0, 8)}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => navigate(`/tasks/${task.id}/edit`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                    </button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                    <button 
                        onClick={handleArchive}
                        className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                        title="Archive Task"
                    >
                        <Archive className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={handleDelete}
                        className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete Task"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 text-slate-400 hover:text-accent-blue transition-colors"
                        title="Close Drawer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="p-8 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {task.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {column?.title || 'Open'}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>opened {new Date(task.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Left Column */}
                    <div className="md:col-span-8 space-y-12">
                        {/* Description Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                <MessageSquare className="w-4 h-4" />
                                Description
                            </div>
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                {task.description ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {task.description}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic text-sm">No description provided.</p>
                                )}
                            </div>
                        </div>

                        {/* Checklists Section */}
                        {task.checklists && task.checklists.length > 0 && (
                            <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                                    <CheckSquare className="w-4 h-4 text-accent-blue" />
                                    Checklists
                                </h3>
                                
                                <div className="space-y-6">
                                    {task.checklists.map((cl) => (
                                        <div key={cl.id} className="glass rounded-2xl border border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/5">
                                            <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{cl.title}</h4>
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                                        {cl.items.filter(i => i.isCompleted).length} / {cl.items.length}
                                                    </span>
                                                </div>
                                                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                                    <div 
                                                        className="h-full bg-accent-blue transition-all duration-500"
                                                        style={{ width: `${cl.items.length > 0 ? (cl.items.filter(i => i.isCompleted).length / cl.items.length) * 100 : 0}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="p-5 space-y-3">
                                                {cl.items.map(item => (
                                                    <div key={item.id} className="flex items-center gap-3 group">
                                                        <button onClick={() => toggleChecklistItem(cl.id, item.id)}>
                                                            {item.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
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
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                                <History className="w-4 h-4 text-accent-blue" />
                                Activity
                            </h3>

                            <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
                                {timelineItems.map((item) => {
                                    const isComment = item.type === 'comment';
                                    const activity = item as Activity;
                                    const comment = item as Comment;

                                    return (
                                        <div key={item.id} className="relative pl-10">
                                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center z-10 overflow-hidden">
                                                {isComment ? (
                                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                        {getInitials(comment.userId)}
                                                    </div>
                                                ) : (
                                                    <div className="text-slate-400">
                                                        {activity.type === 'status_change' && <AlertCircle className="w-3.5 h-3.5" />}
                                                        {activity.type === 'priority_change' && <ArrowUpCircle className="w-3.5 h-3.5" />}
                                                        {activity.type === 'assignee_change' && <UserIcon className="w-3.5 h-3.5" />}
                                                        {activity.type === 'tag_change' && <TagIcon className="w-3.5 h-3.5" />}
                                                        {activity.type === 'task_created' && <Plus className="w-3.5 h-3.5" />}
                                                    </div>
                                                )}
                                            </div>

                                            <div className={isComment ? "glass p-4 rounded-2xl border border-white/5 bg-slate-50/50 dark:bg-white/5" : ""}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                                        {getUserName(item.userId)}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(item.createdAt).toLocaleString()}
                                                    </span>
                                                </div>

                                                {isComment ? (
                                                    <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none mt-1">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                            {comment.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="text-[11px] text-slate-500 font-medium italic">
                                                        {activity.type === 'task_created' && 'created this task'}
                                                        {activity.type === 'priority_change' && (
                                                            <>changed priority from <span className="font-bold text-slate-400">{String(activity.details?.from)}</span> to <span className="font-bold text-accent-blue">{String(activity.details?.to)}</span></>
                                                        )}
                                                        {activity.type === 'assignee_change' && (
                                                            <>changed assignee from <span className="font-bold text-slate-400">{getUserName(activity.details?.from as string)}</span> to <span className="font-bold text-accent-blue">{getUserName(activity.details?.to as string)}</span></>
                                                        )}
                                                        {activity.type === 'tag_change' && activity.details?.text}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* New Comment Input */}
                            <div className="mt-8 pl-10 relative pb-12">
                                <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-500 border border-blue-600 flex items-center justify-center text-white font-bold text-[10px] z-10">
                                    {user ? getInitials(user.id) : '?'}
                                </div>
                                <div className="glass p-4 rounded-2xl border border-white/10 space-y-3 focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300 bg-slate-50/50 dark:bg-white/5">
                                    <textarea 
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="Add a comment..."
                                        className="w-full bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 outline-none resize-none min-h-[80px]"
                                    />
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={handleAddComment}
                                            disabled={!commentInput.trim()}
                                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-accent-blue text-white transition-all text-[11px] disabled:opacity-50"
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
                    <aside className="md:col-span-4 space-y-8">
                        {/* Assignee Section */}
                        <div className="sidebar-section relative" ref={assigneeRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assignee</h3>
                                <button onClick={() => setShowAssigneeMenu(!showAssigneeMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>
                            
                            {assignee ? (
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowAssigneeMenu(true)}>
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                        {assignee.name?.[0] || assignee.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{assignee.name || assignee.email.split('@')[0]}</p>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => setShowAssigneeMenu(true)}
                                    className="flex items-center gap-3 text-slate-400 hover:text-accent-blue transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center group-hover:border-accent-blue">
                                        <UserPlus className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-[11px] font-medium italic">Assign someone</span>
                                </button>
                            )}

                            <AnimatePresence>
                                {showAssigneeMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden bg-white dark:bg-slate-900"
                                    >
                                        <div className="p-1">
                                            <button 
                                                onClick={() => updateAssignee(undefined)}
                                                className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-400 italic transition-all"
                                            >
                                                Clear assignee
                                            </button>
                                            {users.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => updateAssignee(u.id)}
                                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all group"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                        {u.name?.[0] || u.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent-blue transition-colors">{u.name || u.email.split('@')[0]}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Priority Section */}
                        <div className="sidebar-section relative" ref={priorityRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority</h3>
                                <button onClick={() => setShowPriorityMenu(!showPriorityMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
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
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-xl shadow-2xl z-50 p-1 bg-white dark:bg-slate-900"
                                    >
                                        {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                                            <button
                                                key={p}
                                                onClick={() => updatePriority(p)}
                                                className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Labels Section */}
                        <div className="sidebar-section relative" ref={labelRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Labels</h3>
                                <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="p-1 hover:text-accent-blue transition-colors">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>
                            
                            <div className="flex flex-wrap gap-2">
                                {task.tags && task.tags.length > 0 ? (
                                    task.tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-medium italic text-slate-400">No labels</p>
                                )}
                            </div>

                            <AnimatePresence>
                                {showLabelMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 glass border border-white/10 rounded-xl shadow-2xl z-50 p-3 bg-white dark:bg-slate-900"
                                    >
                                        <input 
                                            autoFocus
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={addTag}
                                            placeholder="Add a tag..."
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:ring-1 focus:ring-accent-blue"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default TaskViewer;
