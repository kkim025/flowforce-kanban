import React, { useState, useMemo } from 'react';
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
    X
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
                                {UI_LABELS.DESCRIPTION}
                            </div>
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                {task.description ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                                        {task.description}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-slate-400 italic text-sm">{UI_LABELS.NO_DESCRIPTION}</p>
                                )}
                            </div>
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
