import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';
import {
    Save,
    Plus,
    Layout,
    AlignLeft,
    AlertCircle,
    CheckSquare,
    X,
    Check
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Settings, UserPlus } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import { Priority, Task, Checklist, SubTask, Activity } from '../types';
import { UI_LABELS } from '../lib/constants';
import { getSprintColor } from '../lib/sprint-utils';
import Dropdown from './Dropdown';

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
    const [tagInput, setTagInput] = useState('');
    const [assigneeId, setAssigneeId] = useState<string | undefined>(existingTask?.assigneeId);
    const [sprintId, setSprintId] = useState<string | undefined>(existingTask?.sprintId);
    const [checklists, setChecklists] = useState<Checklist[]>(existingTask?.checklists || []);
    const [sprintDropdownOpen, setSprintDropdownOpen] = useState(false);
    const sprintDropdownRef = useRef<HTMLDivElement>(null);

    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showLabelMenu, setShowLabelMenu] = useState(false);

    const assigneeRef = useRef<HTMLDivElement>(null);
    const priorityRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);

    // Click outside to close dropdowns/menus
    // refs and setters are stable, so memoize the array to avoid new reference on each render
    const dropdownHandlers = useMemo(
        () => [
            [sprintDropdownRef, setSprintDropdownOpen] as [React.RefObject<HTMLElement | null>, (v: boolean) => void],
            [assigneeRef, setShowAssigneeMenu] as [React.RefObject<HTMLElement | null>, (v: boolean) => void],
            [priorityRef, setShowPriorityMenu] as [React.RefObject<HTMLElement | null>, (v: boolean) => void],
            [labelRef, setShowLabelMenu] as [React.RefObject<HTMLElement | null>, (v: boolean) => void],
        ],
        [sprintDropdownRef, assigneeRef, priorityRef, labelRef, setSprintDropdownOpen, setShowAssigneeMenu, setShowPriorityMenu, setShowLabelMenu]
    );

    const handleClickOutside = useCallback((event: MouseEvent) => {
        for (const [ref, setOpen] of dropdownHandlers) {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
    }, [dropdownHandlers]);

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);

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
            // Reset to defaults for new task - include a default empty checklist
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
            sprintId,
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
                        {isEditing ? UI_LABELS.EDIT_TASK : UI_LABELS.CREATE_TASK}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSave}
                        disabled={!title.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs disabled:opacity-50"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {UI_LABELS.SAVE_TASK}
                    </button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                    <button 
                        onClick={() => navigate('/')}
                        className="p-2 text-slate-400 hover:text-accent-blue transition-colors"
                        title={UI_LABELS.CLOSE}
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

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {UI_LABELS.CHECKLISTS}
                                </label>
                                <button 
                                    onClick={addChecklist}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-all"
                                >
                                    <Plus className="w-3 h-3" /> {UI_LABELS.ADD_CHECKLIST}
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
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            updateSubTask(cl.id, item.id, { isCompleted: e.target.checked });
                                                        }}
                                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-accent-blue focus:ring-accent-blue/30 bg-transparent"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={item.title}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            updateSubTask(cl.id, item.id, { title: e.target.value });
                                                        }}
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
                                                <Plus className="w-3.5 h-3.5" /> {UI_LABELS.ADD_ITEM}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <aside className="md:col-span-4 space-y-8">
                        {/* Assignee Section */}
                        <div className="sidebar-section relative" ref={assigneeRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.ASSIGNEE}</h3>
                                <button onClick={() => setShowAssigneeMenu(!showAssigneeMenu)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>

                            {assigneeId ? (
                                <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowAssigneeMenu(true)}>
                                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                        {assigneeId.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{users.find(u => u.id === assigneeId)?.name || users.find(u => u.id === assigneeId)?.email}</p>
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

                            <Dropdown
                                isOpen={showAssigneeMenu}
                                onClose={() => setShowAssigneeMenu(false)}
                            >
                                <div className="p-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setAssigneeId(undefined);
                                            setShowAssigneeMenu(false);
                                        }}
                                        className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-400 italic transition-all"
                                    >
                                        {UI_LABELS.CLEAR_ASSIGNEE}
                                    </button>
                                    {users.map(u => (
                                        <button
                                            type="button"
                                            key={u.id}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setAssigneeId(u.id);
                                                setShowAssigneeMenu(false);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                                {u.id.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent-blue transition-colors">{u.name || u.email}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </Dropdown>
                        </div>

                        {/* Priority Section */}
                        <div className="sidebar-section relative" ref={priorityRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.PRIORITY}</h3>
                                <button onClick={() => setShowPriorityMenu(!showPriorityMenu)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                                className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                    priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                    priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                {priority}
                            </button>

                            <Dropdown
                                isOpen={showPriorityMenu}
                                onClose={() => setShowPriorityMenu(false)}
                                className="p-1"
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                                        <button
                                            type="button"
                                            key={p}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setPriority(p);
                                                setShowPriorityMenu(false);
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-slate-700 dark:text-slate-300"
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </Dropdown>
                        </div>

                        {/* Sprint Section */}
                        <div className="sidebar-section relative" ref={sprintDropdownRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.SPRINT}</h3>
                                <button onClick={() => setSprintDropdownOpen(!sprintDropdownOpen)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>

                            <button
                                onClick={() => setSprintDropdownOpen(!sprintDropdownOpen)}
                                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                {sprintId ? (
                                    <>
                                        <span
                                            className="w-2.5 h-2.5 rounded-full"
                                            style={{ backgroundColor: (() => {
                                                const sprint = state.sprints.find(s => s.id === sprintId);
                                                return sprint ? getSprintColor(sprint, state.sprints) : '#94a3b8';
                                            })() }}
                                        />
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                                            {state.sprints.find(s => s.id === sprintId)?.name || (existingTask?.sprintId === sprintId ? 'Archived Sprint' : UI_LABELS.NO_SPRINT)}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-xs font-medium text-slate-400 italic flex-1 text-left">
                                        {UI_LABELS.NO_SPRINT}
                                    </span>
                                )}
                            </button>

                            <Dropdown isOpen={sprintDropdownOpen} onClose={() => setSprintDropdownOpen(false)} className="p-1" zIndex="z-[1000]">
                                <div onClick={(e) => e.stopPropagation()}>
                                    {/* No Sprint option */}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setSprintId(undefined);
                                            setSprintDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                                            !sprintId ? 'text-accent-blue' : 'text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                        <span className="text-xs font-medium flex-1 text-left">{UI_LABELS.NO_SPRINT}</span>
                                        {!sprintId && <Check className="w-4 h-4 text-accent-blue" />}
                                    </button>

                                    {/* Task's archived sprint (if any) */}
                                    {existingTask?.sprintId && !state.sprints.find(s => s.id === existingTask.sprintId) && (
                                        <>
                                            {state.sprints.length > 0 && <div className="border-t border-slate-100 dark:border-white/5 my-1" />}
                                            {(() => {
                                                const archivedSprint = state.sprints.find(s => s.id === existingTask.sprintId);
                                                if (!archivedSprint) return null;
                                                const color = getSprintColor(archivedSprint, state.sprints);
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setSprintId(archivedSprint.id);
                                                            setSprintDropdownOpen(false);
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors text-slate-600 dark:text-slate-300"
                                                    >
                                                        <span
                                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        <div className="flex-1 text-left">
                                                            <span className="text-xs font-medium block truncate">{archivedSprint.name}</span>
                                                            <span className="text-[10px] text-slate-400">Archived</span>
                                                        </div>
                                                        {sprintId === archivedSprint.id && <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />}
                                                    </button>
                                                );
                                            })()}
                                        </>
                                    )}

                                    {/* Sprint options (non-archived only) */}
                                    {(() => {
                                        const availableSprints = state.sprints.filter(s => s.status !== 'ARCHIVED');
                                        if (availableSprints.length === 0) return null;
                                        return (
                                            <>
                                                <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                                                {availableSprints.map((sprint) => {
                                                    const color = getSprintColor(sprint, state.sprints);
                                                    const isSelected = sprint.id === sprintId;

                                                    return (
                                                        <button
                                                            type="button"
                                                            key={sprint.id}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                setSprintId(sprint.id);
                                                                setSprintDropdownOpen(false);
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                                                                isSelected ? 'text-accent-blue' : 'text-slate-600 dark:text-slate-300'
                                                            }`}
                                                        >
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                                                style={{ backgroundColor: color }}
                                                            />
                                                            <div className="flex-1 text-left">
                                                                <span className="text-xs font-medium block truncate">{sprint.name}</span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {sprint.status === 'ACTIVE' ? 'Active' :
                                                                     sprint.status === 'COMPLETED' ? 'Completed' : 'Planning'}
                                                                </span>
                                                            </div>
                                                            {isSelected && <Check className="w-4 h-4 text-accent-blue flex-shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </>
                                        );
                                    })()}

                                    {state.sprints.length === 0 && (
                                        <div className="px-3 py-4 text-center text-slate-400 text-xs">
                                            {UI_LABELS.NO_SPRINTS_YET}
                                        </div>
                                    )}
                                </div>
                            </Dropdown>
                        </div>

                        {/* Due Date Section */}
                        <div className="sidebar-section">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">{UI_LABELS.DUE_DATE}</h3>
                            <input
                                type="date"
                                value={existingTask?.dueDate ? existingTask.dueDate.split('T')[0] : ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    updateTaskDueDate(taskId as string, value || null);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-blue hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            />
                        </div>

                        {/* Labels Section */}
                        <div className="sidebar-section relative" ref={labelRef}>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.LABELS}</h3>
                                <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                                    <Settings className="w-3 h-3" />
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {tags.length > 0 ? (
                                    tags.map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                            {tag}
                                            <button onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-[10px] font-medium italic text-slate-400">No labels</p>
                                )}
                            </div>

                            <Dropdown
                                isOpen={showLabelMenu}
                                onClose={() => setShowLabelMenu(false)}
                                className="p-3"
                            >
                                <div onClick={(e) => e.stopPropagation()}>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={addTag}
                                        placeholder={UI_LABELS.ADD_TAG}
                                        className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-accent-blue"
                                    />
                                </div>
                            </Dropdown>
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
