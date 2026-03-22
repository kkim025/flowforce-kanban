import React, { useState, useRef, useEffect } from 'react';
import { Settings, UserPlus, X } from 'lucide-react';
import { Task, Priority } from '../types';
import { useUsers } from '../store/UserContext';
import { useKanban } from '../store/KanbanContext';
import { UI_LABELS } from '../lib/constants';
import Dropdown from './Dropdown';
import SprintSelector from './sprints/SprintSelector';

interface TaskSidebarProps {
    task: Task;
    onUpdateAssignee: (userId: string | undefined) => void;
    onUpdatePriority: (priority: Priority) => void;
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
}

const TaskSidebar: React.FC<TaskSidebarProps> = ({
    task,
    onUpdateAssignee,
    onUpdatePriority,
    onAddTag,
    onRemoveTag
}) => {
    const { users, getInitials, getUserName } = useUsers();
    const { activeBoardId } = useKanban();
    const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [showLabelMenu, setShowLabelMenu] = useState(false);
    const [tagInput, setTagInput] = useState('');

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

    const assignee = users.find(u => u.id === task.assigneeId);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            onAddTag(tagInput.trim());
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
                
                {assignee ? (
                    <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setShowAssigneeMenu(true)}>
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                            {getInitials(assignee.id)}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{getUserName(assignee.id)}</p>
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
                    <div className="p-1">
                        <button 
                            onClick={() => {
                                onUpdateAssignee(undefined);
                                setShowAssigneeMenu(false);
                            }}
                            className="w-full flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold text-slate-400 italic transition-all"
                        >
                            {UI_LABELS.CLEAR_ASSIGNEE}
                        </button>
                        {users.map(u => (
                            <button
                                key={u.id}
                                onClick={() => {
                                    onUpdateAssignee(u.id);
                                    setShowAssigneeMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all group"
                            >
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                    {getInitials(u.id)}
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 group-hover:text-accent-blue transition-colors">{getUserName(u.id)}</p>
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
                    task.priority === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                    {task.priority}
                </button>

                <Dropdown 
                    isOpen={showPriorityMenu} 
                    onClose={() => setShowPriorityMenu(false)}
                    className="p-1"
                >
                    {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => {
                                onUpdatePriority(p);
                                setShowPriorityMenu(false);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all text-slate-700 dark:text-slate-300"
                        >
                            {p}
                        </button>
                    ))}
                </Dropdown>
            </div>

            {/* Sprint Section */}
            {activeBoardId && (
                <SprintSelector
                    taskId={task.id}
                    currentSprintId={task.sprintId}
                    boardId={activeBoardId}
                />
            )}

            {/* Labels Section */}
            <div className="sidebar-section relative" ref={labelRef}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{UI_LABELS.LABELS}</h3>
                    <button onClick={() => setShowLabelMenu(!showLabelMenu)} className="p-1 hover:text-accent-blue transition-colors text-slate-400">
                        <Settings className="w-3 h-3" />
                    </button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {task.tags && task.tags.length > 0 ? (
                        task.tags.map(tag => (
                            <span key={tag} className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg border border-slate-200 dark:border-white/5">
                                {tag}
                                <button onClick={() => onRemoveTag(tag)} className="hover:text-red-500 transition-colors">
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
                    <input 
                        autoFocus
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder={UI_LABELS.ADD_TAG}
                        className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-accent-blue"
                    />
                </Dropdown>
            </div>
        </aside>
    );
};

export default TaskSidebar;
