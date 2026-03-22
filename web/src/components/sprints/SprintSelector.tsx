import React, { useState, useRef, useEffect } from 'react';
import { Sprint } from '../../types';
import { useKanban } from '../../store/KanbanContext';
import { assignTaskToSprint } from '../../lib/api';
import { getSprintColor } from '../../lib/sprint-utils';
import { UI_LABELS } from '../../lib/constants';
import Dropdown from '../Dropdown';
import { Calendar, Check } from 'lucide-react';

interface SprintSelectorProps {
    taskId: string;
    currentSprintId?: string;
    boardId: string;
    onAssigned?: () => void;
}

const SprintSelector: React.FC<SprintSelectorProps> = ({
    taskId,
    currentSprintId,
    boardId,
    onAssigned,
}) => {
    const { state, dispatch } = useKanban();
    const { sprints } = state;
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentSprint = sprints.find(s => s.id === currentSprintId);
    const currentSprintIndex = currentSprint ? sprints.indexOf(currentSprint) : -1;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = async (sprintId: string | null) => {
        setIsLoading(true);
        try {
            // Optimistic update
            dispatch({
                type: 'ASSIGN_TASK_TO_SPRINT',
                payload: { taskId, sprintId }
            });

            // API call
            await assignTaskToSprint(taskId, sprintId);

            onAssigned?.();
        } catch (err) {
            console.error('Failed to assign task to sprint:', err);
            // Revert on error - could implement reversion logic here
        } finally {
            setIsLoading(false);
            setIsOpen(false);
        }
    };

    return (
        <div className="sidebar-section relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {UI_LABELS.SPRINT}
                </h3>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-1 hover:text-accent-blue transition-colors text-slate-400"
                >
                    <Calendar className="w-3 h-3" />
                </button>
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isLoading}
                className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-accent-blue rounded-full animate-spin" />
                ) : currentSprint ? (
                    <>
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: getSprintColor(currentSprintIndex) }}
                        />
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                            {currentSprint.name}
                        </span>
                    </>
                ) : (
                    <span className="text-xs font-medium text-slate-400 italic">
                        {UI_LABELS.NO_SPRINT}
                    </span>
                )}
            </button>

            <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} className="p-1" zIndex="z-[1000]">
                {/* No Sprint option */}
                <button
                    onClick={() => handleSelect(null)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors ${
                        !currentSprintId ? 'text-accent-blue' : 'text-slate-600 dark:text-slate-300'
                    }`}
                >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span className="text-xs font-medium flex-1 text-left">{UI_LABELS.NO_SPRINT}</span>
                    {!currentSprintId && <Check className="w-4 h-4 text-accent-blue" />}
                </button>

                {sprints.length > 0 && <div className="border-t border-slate-100 dark:border-white/5 my-1" />}

                {/* Sprint options */}
                {sprints.map((sprint, index) => {
                    const color = getSprintColor(index);
                    const isSelected = sprint.id === currentSprintId;

                    return (
                        <button
                            key={sprint.id}
                            onClick={() => handleSelect(sprint.id)}
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

                {sprints.length === 0 && (
                    <div className="px-3 py-4 text-center text-slate-400 text-xs">
                        {UI_LABELS.NO_SPRINTS_YET}
                    </div>
                )}
            </Dropdown>
        </div>
    );
};

export default SprintSelector;
