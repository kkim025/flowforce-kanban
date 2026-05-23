import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    MessageSquare,
    X,
    Save
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { v4 as uuidv4 } from 'uuid';
import { Priority, Comment } from '../types';
import { getSortedTimeline } from '../lib/utils';
import { UI_LABELS } from '../lib/constants';
import ConfirmationModal from './ConfirmationModal';
import ChecklistSection from './ChecklistSection';
import TaskTimeline from './TaskTimeline';
import CommentForm from './CommentForm';
import TaskSidebar from './TaskSidebar';
import MarkdownEditor from './MarkdownEditor';

const TaskViewer: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const { state, dispatch, updateTaskDueDate } = useKanban();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { users, getInitials, getUserName } = useUsers();
    const { user } = useAuth();
    const navigate = useNavigate();

    const task = taskId ? state.tasks[taskId] : null;

    const timelineItems = useMemo(() => {
        if (!task) return [];
        return getSortedTimeline(task.activities, task.comments);
    }, [task]);

    // UI States
    const [showDeleteTaskConfirm, setShowDeleteTaskConfirm] = useState(false);
    const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editDescription, setEditDescription] = useState(task?.description || '');
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task?.title || '');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const statusBadgeRef = useRef<HTMLDivElement>(null);
    const titleEditRef = useRef<HTMLDivElement>(null);
    const descriptionEditRef = useRef<HTMLDivElement>(null);

    // Close status dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Handle status dropdown click outside
            if (statusBadgeRef.current && !statusBadgeRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
            // Auto-save title if clicking outside title edit area
            if (isEditingTitle && titleEditRef.current && !titleEditRef.current.contains(event.target as Node) && task) {
                if (editTitle.trim()) {
                    dispatch({
                        type: 'UPDATE_TASK',
                        payload: {
                            task: { ...task, title: editTitle.trim() }
                        }
                    });
                }
                setIsEditingTitle(false);
            }
            // Auto-save description if clicking outside description edit area
            if (isEditingDescription && descriptionEditRef.current && !descriptionEditRef.current.contains(event.target as Node) && task) {
                dispatch({
                    type: 'UPDATE_TASK',
                    payload: {
                        task: { ...task, description: editDescription }
                    }
                });
                setIsEditingDescription(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingTitle, isEditingDescription, editTitle, editDescription, task, dispatch]);

    if (!task) {
        return (
            <div className="p-12 flex flex-col items-center justify-center h-full">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{UI_LABELS.TASK_NOT_FOUND}</h1>
                <button 
                    onClick={() => navigate('/')}
                    className="text-accent-blue hover:underline font-bold text-sm uppercase tracking-widest"
                >
                    {UI_LABELS.BACK_TO_BOARD}
                </button>
            </div>
        );
    }

    const column = Object.values(state.columns).find(col => col.taskIds.includes(task.id));

    const handleDelete = () => {
        if (column) {
            dispatch({ type: 'DELETE_TASK', payload: { taskId: task.id, columnId: column.id } });
            navigate('/');
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
        // Use TOGGLE_SUBTASK for proper API persistence without triggering syncChecklistsForTask
        dispatch({ type: 'TOGGLE_SUBTASK', payload: { subtaskId: itemId } });
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
    };

    const addTag = (tag: string) => {
        if (!task.tags.includes(tag)) {
            const newTags = [...task.tags, tag];
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

    const handleAddComment = (content: string) => {
        const commentId = uuidv4();
        const newComment: Comment = {
            id: commentId,
            taskId: task.id,
            userId: user?.id || 'anonymous',
            content: content,
            createdAt: new Date().toISOString()
        };

        dispatch({ 
            type: 'ADD_COMMENT', 
            payload: { 
                taskId: task.id, 
                comment: newComment
            } 
        });
    };

    const handleUpdateComment = (comment: Comment, newContent: string) => {
        dispatch({
            type: 'UPDATE_COMMENT',
            payload: {
                taskId: task.id,
                comment: {
                    ...comment,
                    content: newContent
                }
            }
        });
    };

    const handleDeleteComment = () => {
        if (deletingCommentId && user) {
            dispatch({
                type: 'DELETE_COMMENT',
                payload: {
                    taskId: task.id,
                    commentId: deletingCommentId,
                    userId: user.id
                }
            });
            setDeletingCommentId(null);
        }
    };

    const handleEditDescription = () => {
        setEditDescription(task.description || '');
        setIsEditingDescription(true);
    };

    const handleSaveDescription = () => {
        dispatch({
            type: 'UPDATE_TASK',
            payload: {
                task: { ...task, description: editDescription }
            }
        });
        setIsEditingDescription(false);
    };

    const handleCancelDescription = () => {
        setEditDescription(task.description || '');
        setIsEditingDescription(false);
    };

    const handleEditTitle = () => {
        setEditTitle(task.title || '');
        setIsEditingTitle(true);
    };

    const handleSaveTitle = () => {
        if (editTitle.trim()) {
            dispatch({
                type: 'UPDATE_TASK',
                payload: {
                    task: { ...task, title: editTitle.trim() }
                }
            });
        }
        setIsEditingTitle(false);
    };

    const handleCancelTitle = () => {
        setEditTitle(task.title || '');
        setIsEditingTitle(false);
    };

    const handleChangeStatus = (newColumnId: string) => {
        const sourceColumn = Object.values(state.columns).find(col => col.taskIds.includes(task.id));
        if (!sourceColumn || sourceColumn.id === newColumnId) {
            setShowStatusDropdown(false);
            return;
        }
        const sourceIndex = sourceColumn.taskIds.indexOf(task.id);
        const destinationColumn = state.columns[newColumnId];
        if (!destinationColumn) {
            setShowStatusDropdown(false);
            return;
        }
        dispatch({
            type: 'MOVE_TASK',
            payload: {
                taskId: task.id,
                sourceColId: sourceColumn.id,
                destinationColId: newColumnId,
                sourceIndex,
                destinationIndex: destinationColumn.taskIds.length,
            },
        });
        setShowStatusDropdown(false);
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
                        {UI_LABELS.EDIT}
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
                        onClick={() => setShowDeleteTaskConfirm(true)}
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
                    {isEditingTitle ? (
                        <div className="space-y-3" ref={titleEditRef}>
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-accent-blue p-0 text-3xl font-black text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-0 outline-none"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveTitle}
                                    disabled={!editTitle.trim()}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs disabled:opacity-50"
                                >
                                    <Save className="w-3.5 h-3.5" />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelTitle}
                                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs text-slate-600 dark:text-slate-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <h1
                            onClick={handleEditTitle}
                            className="text-3xl font-black text-slate-900 dark:text-white leading-tight cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl p-1 -m-1 transition-colors"
                        >
                            {task.title}
                        </h1>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium">
                        <div className="relative" ref={statusBadgeRef}>
                            <div
                                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider cursor-pointer hover:bg-emerald-500/20 transition-colors"
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                {column?.title || 'Open'}
                            </div>
                            {showStatusDropdown && (
                                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                                    {state.columnOrder.map(colId => {
                                        const col = state.columns[colId];
                                        if (!col) return null;
                                        const isCurrentColumn = colId === column?.id;
                                        return (
                                            <button
                                                key={colId}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleChangeStatus(colId);
                                                }}
                                                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/10 transition-colors ${
                                                    isCurrentColumn ? 'text-accent-blue bg-accent-blue/5' : 'text-slate-700 dark:text-slate-200'
                                                }`}
                                            >
                                                {col.title}
                                                {isCurrentColumn && (
                                                    <span className="ml-auto text-accent-blue">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
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
                                {UI_LABELS.DESCRIPTION}
                            </div>
                            {isEditingDescription ? (
                                <div className="space-y-3" ref={descriptionEditRef}>
                                    <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300">
                                        <MarkdownEditor
                                            value={editDescription}
                                            onChange={setEditDescription}
                                            placeholder={UI_LABELS.ADD_DETAILS}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSaveDescription}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs"
                                        >
                                            <Save className="w-3.5 h-3.5" />
                                            Save
                                        </button>
                                        <button
                                            onClick={handleCancelDescription}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs text-slate-600 dark:text-slate-300"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    onClick={handleEditDescription}
                                    className="prose prose-slate dark:prose-invert max-w-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl p-3 -m-3 transition-colors"
                                >
                                    {task.description ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                            {task.description}
                                        </ReactMarkdown>
                                    ) : (
                                        <p className="text-slate-400 italic text-sm">{UI_LABELS.NO_DESCRIPTION}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Checklists Section */}
                        <ChecklistSection 
                            checklists={task.checklists || []} 
                            onToggleChecklistItem={toggleChecklistItem} 
                        />

                        {/* Activity & Comments Section */}
                        <div>
                            <TaskTimeline 
                                timelineItems={timelineItems}
                                user={user}
                                onUpdateComment={handleUpdateComment}
                                onDeleteComment={setDeletingCommentId}
                            />

                            {/* New Comment Input */}
                            <CommentForm 
                                user={user}
                                onAddComment={handleAddComment}
                            />
                        </div>
                    </div>

                    {/* Right Column - Sidebar */}
                    <TaskSidebar
                        task={task}
                        onUpdateAssignee={updateAssignee}
                        onUpdatePriority={updatePriority}
                        onAddTag={addTag}
                        onRemoveTag={removeTag}
                        updateTaskDueDate={updateTaskDueDate}
                    />
                </div>
            </div>

            {/* Confirmation Modals */}
            <ConfirmationModal 
                isOpen={showDeleteTaskConfirm}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmLabel="Delete Task"
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteTaskConfirm(false)}
                variant="danger"
            />

            <ConfirmationModal 
                isOpen={deletingCommentId !== null}
                title="Delete Comment"
                message="Are you sure you want to delete this comment?"
                confirmLabel="Delete Comment"
                onConfirm={handleDeleteComment}
                onCancel={() => setDeletingCommentId(null)}
                variant="danger"
            />
        </div>
    );
};

export default TaskViewer;
