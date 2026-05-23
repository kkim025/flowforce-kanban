import React, { useState, useRef, useEffect } from 'react';
import { Clock, AlertCircle, Save } from 'lucide-react';
import { Task, Column } from '../types';
import { UI_LABELS } from '../lib/constants';

interface TaskTitleSectionProps {
    task: Task;
    column: Column | undefined;
    columnOrder: string[];
    columns: Record<string, Column>;
    onTitleSave: (title: string) => void;
    onStatusChange: (newColumnId: string) => void;
}

const TaskTitleSection: React.FC<TaskTitleSectionProps> = ({
    task,
    column,
    columnOrder,
    columns,
    onTitleSave,
    onStatusChange,
}) => {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const statusBadgeRef = useRef<HTMLDivElement>(null);
    const titleEditRef = useRef<HTMLDivElement>(null);

    // Reset editTitle when task.title changes externally
    useEffect(() => {
        if (!isEditingTitle) {
            setEditTitle(task.title);
        }
    }, [task.title, isEditingTitle]);

    // Close status dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (statusBadgeRef.current && !statusBadgeRef.current.contains(event.target as Node)) {
                setShowStatusDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSaveTitle = () => {
        if (editTitle.trim()) {
            onTitleSave(editTitle.trim());
        }
        setIsEditingTitle(false);
    };

    const handleCancelTitle = () => {
        setEditTitle(task.title);
        setIsEditingTitle(false);
    };

    const handleEditTitle = () => {
        setEditTitle(task.title);
        setIsEditingTitle(true);
    };

    return (
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
                            {columnOrder.map(colId => {
                                const col = columns[colId];
                                if (!col) return null;
                                const isCurrentColumn = colId === column?.id;
                                return (
                                    <button
                                        key={colId}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onStatusChange(colId);
                                            setShowStatusDropdown(false);
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
    );
};

export default TaskTitleSection;