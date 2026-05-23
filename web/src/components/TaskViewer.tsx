import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Priority, Comment } from '../types';
import { getSortedTimeline } from '../lib/utils';
import { UI_LABELS } from '../lib/constants';
import ConfirmationModal from './ConfirmationModal';
import ChecklistSection from './ChecklistSection';
import TaskTimeline from './TaskTimeline';
import CommentForm from './CommentForm';
import TaskSidebar from './TaskSidebar';
import TaskViewerHeader from './TaskViewerHeader';
import TaskTitleSection from './TaskTitleSection';
import InlineDescriptionEditor from './InlineDescriptionEditor';

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

    const handleTitleSave = (title: string) => {
        dispatch({
            type: 'UPDATE_TASK',
            payload: {
                task: { ...task, title }
            }
        });
    };

    const handleDescriptionSave = (description: string) => {
        dispatch({
            type: 'UPDATE_TASK',
            payload: {
                task: { ...task, description }
            }
        });
    };

    const handleStatusChange = (newColumnId: string) => {
        const sourceColumn = Object.values(state.columns).find(col => col.taskIds.includes(task.id));
        if (!sourceColumn || sourceColumn.id === newColumnId) return;

        const sourceIndex = sourceColumn.taskIds.indexOf(task.id);
        const destinationColumn = state.columns[newColumnId];
        if (!destinationColumn) return;

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
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <TaskViewerHeader
                task={task}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onShowDeleteConfirm={() => setShowDeleteTaskConfirm(true)}
            />

            <div className="p-8 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                <TaskTitleSection
                    task={task}
                    column={column}
                    columnOrder={state.columnOrder}
                    columns={state.columns}
                    onTitleSave={handleTitleSave}
                    onStatusChange={handleStatusChange}
                />

                {/* Content Area */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Left Column */}
                    <div className="md:col-span-8 space-y-12">
                        <InlineDescriptionEditor
                            task={task}
                            onDescriptionSave={handleDescriptionSave}
                        />

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