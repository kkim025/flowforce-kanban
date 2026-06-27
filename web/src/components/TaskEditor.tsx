import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Layout, AlignLeft } from 'lucide-react';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import MarkdownEditor from './MarkdownEditor';
import { Priority, Task, Checklist, SubTask, Activity } from '../types';
import { UI_LABELS } from '../lib/constants';
import TaskEditorHeader from './TaskEditorHeader';
import TaskEditorChecklists from './TaskEditorChecklists';
import TaskEditorSidebar from './TaskEditorSidebar';

const TaskEditor: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { state, dispatch, updateTaskDueDate } = useKanban();
    const { users } = useUsers();
    const { user } = useAuth();

    const isEditing = !!taskId;
    const existingTask = taskId ? state.tasks[taskId] : null;

    const [title, setTitle] = useState(existingTask?.title || '');
    const [description, setDescription] = useState(existingTask?.description || '');
    const [priority, setPriority] = useState<Priority>(existingTask?.priority || 'medium');
    const [tags, setTags] = useState<string[]>(existingTask?.tags || []);
    const [assigneeId, setAssigneeId] = useState<string | undefined>(existingTask?.assigneeId);
    const [sprintId, setSprintId] = useState<string | undefined>(existingTask?.sprintId);
    const [checklists, setChecklists] = useState<Checklist[]>(existingTask?.checklists || []);

    // Reset form state when taskId changes (navigating between create and edit)
    useEffect(() => {
        if (taskId) {
            const task = state.tasks[taskId];
            setTitle(task?.title || '');
            setDescription(task?.description || '');
            setPriority(task?.priority || 'medium');
            setTags(task?.tags || []);
            setAssigneeId(task?.assigneeId);
            setSprintId(task?.sprintId);
            setChecklists(task?.checklists || []);
        } else {
            setTitle('');
            setDescription('');
            setPriority('medium');
            setTags([]);
            setAssigneeId(undefined);
            setSprintId(undefined);
            setChecklists([{
                id: uuidv4(),
                title: 'Checklist',
                taskId: '',
                items: []
            }]);
        }
    }, [taskId, state.tasks]);

    // Get columnId from URL if creating new task
    const queryParams = new URLSearchParams(location.search);
    const columnId = queryParams.get('columnId') || state.columnOrder[0];

    const handleSave = useCallback(() => {
        if (!title.trim()) return;

        const newTaskId = isEditing ? (taskId as string) : uuidv4();

        const processedChecklists = checklists.map(cl => ({
            ...cl,
            taskId: newTaskId
        }));

        const updatedTask: Task = {
            id: newTaskId,
            title: title.trim(),
            description: description.trim(),
            priority,
            tags,
            assigneeId,
            checklists: processedChecklists,
            subTasks: existingTask?.subTasks || [],
            createdAt: existingTask?.createdAt || new Date().toISOString(),
            isArchived: existingTask?.isArchived || false,
            comments: existingTask?.comments || [],
            activities: [...(existingTask?.activities || [])],
            sprintId,
        };

        if (isEditing) {
            if (existingTask) {
                if (existingTask.priority !== priority) {
                    const activity: Activity = {
                        id: uuidv4(),
                        taskId: existingTask.id,
                        userId: user?.id || 'anonymous',
                        type: 'priority_change',
                        details: { from: existingTask.priority, to: priority },
                        createdAt: new Date().toISOString()
                    };
                    updatedTask.activities.push(activity);
                }
                if (existingTask.assigneeId !== assigneeId) {
                    const activity: Activity = {
                        id: uuidv4(),
                        taskId: existingTask.id,
                        userId: user?.id || 'anonymous',
                        type: 'assignee_change',
                        details: {
                            from: existingTask.assigneeId || 'unassigned',
                            to: assigneeId || 'unassigned'
                        },
                        createdAt: new Date().toISOString()
                    };
                    updatedTask.activities.push(activity);
                }
            }
            dispatch({ type: 'UPDATE_TASK', payload: { task: updatedTask } });
        } else {
            const activity: Activity = {
                id: uuidv4(),
                taskId: updatedTask.id,
                userId: user?.id || 'anonymous',
                type: 'task_created',
                createdAt: new Date().toISOString()
            };
            updatedTask.activities.push(activity);

            dispatch({
                type: 'ADD_TASK',
                payload: { task: updatedTask, columnId: columnId as string }
            });
        }

        navigate(isEditing ? `/tasks/${updatedTask.id}` : '/');
    }, [title, description, priority, tags, assigneeId, checklists, sprintId, isEditing, taskId, existingTask, user, dispatch, navigate, columnId]);

    const addChecklist = () => {
        const newChecklist: Checklist = {
            id: uuidv4(),
            title: 'New Checklist',
            taskId: isEditing ? (taskId as string) : '',
            items: []
        };
        setChecklists([...checklists, newChecklist]);
    };

    const removeChecklist = (id: string) => {
        setChecklists(checklists.filter(cl => cl.id !== id));
    };

    const updateChecklistTitle = (id: string, newTitle: string) => {
        setChecklists(checklists.map(cl => cl.id === id ? { ...cl, title: newTitle } : cl));
    };

    const addSubTask = (checklistId: string) => {
        setChecklists(checklists.map(cl => {
            if (cl.id === checklistId) {
                const newItem: SubTask = {
                    id: uuidv4(),
                    title: '',
                    isCompleted: false,
                    checklistId
                };
                return { ...cl, items: [...cl.items, newItem] };
            }
            return cl;
        }));
    };

    const updateSubTask = (checklistId: string, itemId: string, updates: Partial<SubTask>) => {
        setChecklists(checklists.map(cl => {
            if (cl.id === checklistId) {
                return {
                    ...cl,
                    items: cl.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
                };
            }
            return cl;
        }));
    };

    const removeSubTask = (checklistId: string, itemId: string) => {
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

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <TaskEditorHeader
                isEditing={isEditing}
                onSave={handleSave}
                canSave={!!title.trim()}
            />

            <div className="p-8 space-y-12 flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Main Content */}
                    <div className="md:col-span-8 space-y-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layout className="w-3.5 h-3.5" />
                                {UI_LABELS.TASK_TITLE}
                            </label>
                            <input
                                autoFocus
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full bg-transparent border-none p-0 text-3xl font-black text-slate-900 dark:text-white placeholder:text-slate-200 dark:placeholder:text-slate-800 focus:ring-0 outline-none"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlignLeft className="w-3.5 h-3.5" />
                                {UI_LABELS.DESCRIPTION}
                            </label>
                            <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300">
                                <MarkdownEditor
                                    value={description}
                                    onChange={setDescription}
                                    placeholder={UI_LABELS.ADD_DETAILS}
                                />
                            </div>
                        </div>

                        <TaskEditorChecklists
                            checklists={checklists}
                            onAddChecklist={addChecklist}
                            onRemoveChecklist={removeChecklist}
                            onUpdateChecklistTitle={updateChecklistTitle}
                            onAddSubTask={addSubTask}
                            onUpdateSubTask={updateSubTask}
                            onRemoveSubTask={removeSubTask}
                        />
                    </div>

                    {/* Sidebar */}
                    <TaskEditorSidebar
                        assigneeId={assigneeId}
                        priority={priority}
                        sprintId={sprintId}
                        tags={tags}
                        existingTask={existingTask}
                        isEditing={isEditing}
                        columnTitle={state.columns[columnId as string]?.title || columnId}
                        users={users}
                        sprints={state.sprints}
                        onAssigneeChange={setAssigneeId}
                        onPriorityChange={setPriority}
                        onSprintChange={setSprintId}
                        onTagAdd={(tag) => setTags([...tags, tag])}
                        onTagRemove={(tag) => setTags(tags.filter(t => t !== tag))}
                        updateTaskDueDate={updateTaskDueDate}
                        taskId={taskId}
                    />
                </div>
            </div>
        </div>
    );
};

export default TaskEditor;