import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Settings, UserPlus, Check, AlertCircle, X } from 'lucide-react';
import { User, Sprint, Priority, Task } from '../types';
import { UI_LABELS } from '../lib/constants';
import { getSprintColor } from '../lib/sprint-utils';
import Dropdown from './Dropdown';

interface TaskEditorSidebarProps {
    assigneeId: string | undefined;
    priority: Priority;
    sprintId: string | undefined;
    tags: string[];
    existingTask: Task | null;
    isEditing: boolean;
    columnTitle: string;
    users: User[];
    sprints: Sprint[];
    onAssigneeChange: (userId: string | undefined) => void;
    onPriorityChange: (priority: Priority) => void;
    onSprintChange: (sprintId: string | undefined) => void;
    onTagAdd: (tag: string) => void;
    onTagRemove: (tag: string) => void;
    updateTaskDueDate: (taskId: string, dueDate: string | null) => void;
    taskId?: string;
}

const TaskEditorSidebar: React.FC<TaskEditorSidebarProps> = ({
    assigneeId,
    priority,
    sprintId,
    tags,
    existingTask,
    isEditing,
    columnTitle,
    users,
    sprints,
    onAssigneeChange,
    onPriorityChange,
    onSprintChange,
    onTagAdd,
    onTagRemove,
    updateTaskDueDate,
    taskId,
}) => {
    const [showAssigneeMenu, setShowAssigneeMenu] = React.useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = React.useState(false);
    const [showLabelMenu, setShowLabelMenu] = React.useState(false);
    const [showSprintMenu, setShowSprintMenu] = React.useState(false);
    const [tagInput, setTagInput] = React.useState('');

    const assigneeRef = useRef<HTMLDivElement>(null);
    const priorityRef = useRef<HTMLDivElement>(null);
    const labelRef = useRef<HTMLDivElement>(null);
    const sprintRef = useRef<HTMLDivElement>(null);

    const dropdownHandlers: [React.RefObject<HTMLDivElement | null>, (v: boolean) => void][] = useMemo(
        () => [
            [assigneeRef, setShowAssigneeMenu],
            [priorityRef, setShowPriorityMenu],
            [labelRef, setShowLabelMenu],
            [sprintRef, setShowSprintMenu],
        ],
        [assigneeRef, priorityRef, labelRef, sprintRef]
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            for (const [ref, setOpen] of dropdownHandlers) {
                if (ref.current && !ref.current.contains(event.target as Node)) {
                    setOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [dropdownHandlers]);

    const addTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!tags.includes(tagInput.trim())) {
                onTagAdd(tagInput.trim());
            }
            setTagInput('');
        }
    };

    return (
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
                                onAssigneeChange(undefined);
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
                                    onAssigneeChange(u.id);
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
                                    onPriorityChange(p);
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
            <div className="sidebar-section relative" ref={sprintRef}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.SPRINT}</h3>
                    <button onClick={() => setShowSprintMenu(!showSprintMenu)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                        <Settings className="w-3 h-3" />
                    </button>
                </div>

                <button
                    onClick={() => setShowSprintMenu(!showSprintMenu)}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                >
                    {sprintId ? (
                        <>
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: (() => {
                                    const sprint = sprints.find(s => s.id === sprintId);
                                    return sprint ? getSprintColor(sprint, sprints) : '#94a3b8';
                                })() }}
                            />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-1 text-left">
                                {sprints.find(s => s.id === sprintId)?.name || (existingTask?.sprintId === sprintId ? 'Archived Sprint' : UI_LABELS.NO_SPRINT)}
                            </span>
                        </>
                    ) : (
                        <span className="text-xs font-medium text-slate-400 italic flex-1 text-left">
                            {UI_LABELS.NO_SPRINT}
                        </span>
                    )}
                </button>

                <Dropdown isOpen={showSprintMenu} onClose={() => setShowSprintMenu(false)} className="p-1" zIndex="z-[1000]">
                    <div onClick={(e) => e.stopPropagation()}>
                        {/* No Sprint option */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSprintChange(undefined);
                                setShowSprintMenu(false);
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
                        {existingTask?.sprintId && !sprints.find(s => s.id === existingTask.sprintId) && (
                            <>
                                {sprints.length > 0 && <div className="border-t border-slate-100 dark:border-white/5 my-1" />}
                                {(() => {
                                    const archivedSprint = sprints.find(s => s.id === existingTask.sprintId);
                                    if (!archivedSprint) return null;
                                    const color = getSprintColor(archivedSprint, sprints);
                                    return (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                onSprintChange(archivedSprint.id);
                                                setShowSprintMenu(false);
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
                            const availableSprints = sprints.filter(s => s.status !== 'ARCHIVED');
                            if (availableSprints.length === 0) return null;
                            return (
                                <>
                                    <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                                    {availableSprints.map((sprint) => {
                                        const color = getSprintColor(sprint, sprints);
                                        const isSelected = sprint.id === sprintId;

                                        return (
                                            <button
                                                type="button"
                                                key={sprint.id}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onSprintChange(sprint.id);
                                                    setShowSprintMenu(false);
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

                        {sprints.length === 0 && (
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
                        if (taskId) {
                            updateTaskDueDate(taskId, value || null);
                        }
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
                                <button onClick={() => onTagRemove(tag)} className="hover:text-red-500 transition-colors">
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
                        You are currently {isEditing ? 'editing an existing task' : 'creating a new task'} in <span className="font-bold underline">{columnTitle}</span>. Changes will be saved to the database.
                    </p>
                </div>
            </div>
        </aside>
    );
};

export default TaskEditorSidebar;