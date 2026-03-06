import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import { 
    Save, 
    Plus, 
    Layout, 
    AlignLeft, 
    BarChart2, 
    Tag, 
    User as UserIcon,
    AlertCircle,
    CheckSquare,
    X
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import MarkdownEditor from './MarkdownEditor';
import { Priority, Task, Checklist, SubTask, Activity } from '../types';

const TaskEditor: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { state, dispatch } = useKanban();
    const { users } = useUsers();
    const { user } = useAuth();

    const isEditing = !!taskId;
    const existingTask = taskId ? state.tasks[taskId] : null;

    const [title, setTitle] = useState(existingTask?.title || '');
    const [description, setDescription] = useState(existingTask?.description || '');
    const [priority, setPriority] = useState<Priority>(existingTask?.priority || 'medium');
    const [tags, setTags] = useState<string[]>(existingTask?.tags || []);
    const [tagInput, setTagInput] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>(existingTask?.assigneeId);
    const [checklists, setChecklists] = useState<Checklist[]>(existingTask?.checklists || []);

    // Get columnId from URL if creating new task
    const queryParams = new URLSearchParams(location.search);
    const columnId = queryParams.get('columnId') || state.columnOrder[0];

    const handleSave = () => {
        if (!title.trim()) return;

        const newTaskId = isEditing ? (taskId as string) : uuidv4();
        
        // Ensure all checklists have the correct taskId
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
            // CRITICAL: Rigorously preserve comments and activities
            comments: existingTask?.comments || [],
            activities: [...(existingTask?.activities || [])],
        };

        if (isEditing) {
            // Check for changes to log activities
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
            // For new tasks, add a task_created activity
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
    };

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                setTags([...tags, tagInput.trim()]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(t => t !== tagToRemove));
    };

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
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                        {isEditing ? 'Edit Task' : 'Create New Task'}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        Save Task
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
                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                    {/* Main Content */}
                    <div className="md:col-span-8 space-y-10">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layout className="w-3.5 h-3.5" />
                                Task Title
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
                                Description
                            </label>
                            <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300">
                                <MarkdownEditor 
                                    value={description}
                                    onChange={setDescription}
                                    placeholder="Add more details... (Markdown supported)"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    Checklists
                                </label>
                                <button 
                                    onClick={addChecklist}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-all"
                                >
                                    <Plus className="w-3 h-3" /> Add Checklist
                                </button>
                            </div>

                            <div className="space-y-6">
                                {checklists.map((cl) => (
                                    <div key={cl.id} className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/5">
                                        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-white/5 flex items-center gap-3">
                                            <input 
                                                type="text"
                                                value={cl.title}
                                                onChange={(e) => updateChecklistTitle(cl.id, e.target.value)}
                                                className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
                                            />
                                            <button onClick={() => removeChecklist(cl.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="p-5 space-y-3">
                                            {cl.items.map(item => (
                                                <div key={item.id} className="flex items-center gap-3 group">
                                                    <input 
                                                        type="checkbox"
                                                        checked={item.isCompleted}
                                                        onChange={(e) => updateSubTask(cl.id, item.id, { isCompleted: e.target.checked })}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-accent-blue focus:ring-accent-blue/30 bg-transparent"
                                                    />
                                                    <input 
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => updateSubTask(cl.id, item.id, { title: e.target.value })}
                                                        placeholder="Item description..."
                                                        className={`flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 outline-none ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                                                    />
                                                    <button onClick={() => removeSubTask(cl.id, item.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => addSubTask(cl.id)}
                                                className="flex items-center gap-2 text-xs font-bold text-accent-blue hover:underline mt-2"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add an item
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="md:col-span-4 space-y-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserIcon className="w-3.5 h-3.5" />
                                Assignee
                            </label>
                            <select 
                                value={assigneeId || ''}
                                onChange={(e) => setAssigneeId(e.target.value || undefined)}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all"
                            >
                                <option value="">Unassigned</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <BarChart2 className="w-3.5 h-3.5" />
                                Priority
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                            priority === p 
                                                ? 'bg-accent-blue text-white border-accent-blue shadow-lg shadow-accent-blue/20' 
                                                : 'bg-white dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/5 hover:border-accent-blue/30'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Tag className="w-3.5 h-3.5" />
                                Labels
                            </label>
                            <div className="space-y-3">
                                <input 
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={addTag}
                                    placeholder="Press enter to add..."
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent-blue/30 transition-all"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
                            <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                                <p className="text-[11px] text-amber-600 dark:text-amber-400/80 leading-relaxed font-medium">
                                    You are currently {isEditing ? 'editing an existing task' : 'creating a new task'} in <span className="font-bold underline">{state.columns[columnId as string]?.title}</span>. Changes will be saved to the database.
                                </p>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default TaskEditor;
