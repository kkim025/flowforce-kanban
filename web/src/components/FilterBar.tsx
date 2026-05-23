import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { Priority } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, X, ChevronDown, User as UserIcon, Tag, Flag } from 'lucide-react';

const PRIORITY_OPTIONS: { value: Priority | null; label: string; color: string }[] = [
    { value: null, label: 'All', color: 'bg-slate-100 dark:bg-slate-800' },
    { value: 'high', label: 'High', color: 'bg-red-500/10 text-red-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-500' },
    { value: 'low', label: 'Low', color: 'bg-emerald-500/10 text-emerald-500' },
];

const FilterBar: React.FC = () => {
    const { state, dispatch } = useKanban();
    const { users } = useUsers();
    const [isOpen, setIsOpen] = useState(false);
    const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
    const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const { assigneeFilter, priorityFilter, tagFilter } = state;

    // Get all unique tags from all tasks
    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        Object.values(state.tasks).forEach(task => {
            (task.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
    }, [state.tasks]);

    const hasActiveFilters = assigneeFilter !== null || priorityFilter !== null || tagFilter.length > 0;

    const handleClearAll = () => {
        dispatch({ type: 'CLEAR_ALL_FILTERS' });
    };

    const handleAssigneeSelect = (userId: string | null) => {
        dispatch({ type: 'SET_ASSIGNEE_FILTER', payload: userId });
        setShowAssigneeDropdown(false);
    };

    const handlePrioritySelect = (priority: Priority | null) => {
        dispatch({ type: 'SET_PRIORITY_FILTER', payload: priority });
        setShowPriorityDropdown(false);
    };

    const handleTagToggle = (tag: string) => {
        const newTags = tagFilter.includes(tag)
            ? tagFilter.filter(t => t !== tag)
            : [...tagFilter, tag];
        dispatch({ type: 'SET_TAG_FILTER', payload: newTags });
    };

    const selectedAssignee = users.find(u => u.id === assigneeFilter);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            // Check if click is outside both the trigger button AND the panel
            if (
                panelRef.current && !panelRef.current.contains(target) &&
                triggerRef.current && !triggerRef.current.contains(target)
            ) {
                setIsOpen(false);
                setShowAssigneeDropdown(false);
                setShowPriorityDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    hasActiveFilters
                        ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                        : 'bg-white/50 dark:bg-slate-900/50 border border-white/20 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                        {[assigneeFilter, priorityFilter, tagFilter.length > 0].filter(Boolean).length}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={panelRef}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full right-0 mt-2 w-96 glass border border-white/20 rounded-2xl p-4 shadow-xl z-50"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-white">Advanced Filters</h3>
                            {hasActiveFilters && (
                                <button
                                    onClick={handleClearAll}
                                    className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
                                >
                                    <X className="w-3 h-3" /> Clear All
                                </button>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Assignee Filter */}
                            <div className="relative filter-dropdown">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    <UserIcon className="w-3 h-3" /> Assignee
                                </label>
                                <button
                                    onClick={() => {
                                        setShowAssigneeDropdown(!showAssigneeDropdown);
                                        setShowPriorityDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span className={selectedAssignee ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                                        {selectedAssignee ? selectedAssignee.name || selectedAssignee.email : 'All Assignees'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>
                                <AnimatePresence>
                                    {showAssigneeDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto"
                                        >
                                            <button
                                                onClick={() => handleAssigneeSelect(null)}
                                                className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500"
                                            >
                                                All Assignees
                                            </button>
                                            {users.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => handleAssigneeSelect(user.id)}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${
                                                        assigneeFilter === user.id ? 'bg-accent-blue/10 text-accent-blue' : 'text-slate-900 dark:text-white'
                                                    }`}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                                                        {user.name?.[0] || user.email[0].toUpperCase()}
                                                    </div>
                                                    {user.name || user.email}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Priority Filter */}
                            <div className="relative filter-dropdown">
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    <Flag className="w-3 h-3" /> Priority
                                </label>
                                <button
                                    onClick={() => {
                                        setShowPriorityDropdown(!showPriorityDropdown);
                                        setShowAssigneeDropdown(false);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <span className={priorityFilter ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
                                        {priorityFilter ? PRIORITY_OPTIONS.find(p => p.value === priorityFilter)?.label : 'All Priorities'}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                </button>
                                <AnimatePresence>
                                    {showPriorityDropdown && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -5 }}
                                            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10"
                                        >
                                            {PRIORITY_OPTIONS.map(option => (
                                                <button
                                                    key={String(option.value)}
                                                    onClick={() => handlePrioritySelect(option.value)}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${
                                                        priorityFilter === option.value ? 'bg-accent-blue/10 text-accent-blue' : 'text-slate-900 dark:text-white'
                                                    }`}
                                                >
                                                    <span className={`w-2 h-2 rounded-full ${option.color}`} />
                                                    {option.label}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Tags Filter */}
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                                    <Tag className="w-3 h-3" /> Tags
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {allTags.length === 0 ? (
                                        <span className="text-xs text-slate-400 italic">No tags available</span>
                                    ) : (
                                        allTags.map(tag => (
                                            <button
                                                key={tag}
                                                onClick={() => handleTagToggle(tag)}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                                                    tagFilter.includes(tag)
                                                        ? 'bg-accent-blue text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                                }`}
                                            >
                                                #{tag}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FilterBar;