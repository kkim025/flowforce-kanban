import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sprint } from '../../types';
import { getSprintColor, formatSprintDateRange } from '../../lib/sprint-utils';
import { UI_LABELS } from '../../lib/constants';
import { Check, ChevronDown } from 'lucide-react';

const DROPDOWN_GAP = 8;

interface SprintSwitcherProps {
    sprints: Sprint[];
    activeSprintId: string | null;
    onSelect: (sprintId: string | null) => void;
}

const SprintSwitcher: React.FC<SprintSwitcherProps> = ({
    sprints,
    activeSprintId,
    onSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [focusedIndex, setFocusedIndex] = useState(-1);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);

    const activeSprint = activeSprintId
        ? sprints.find(s => s.id === activeSprintId)
        : null;

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (!isMountedRef.current) return;

            const target = event.target as Node;
            const isInsideButton = buttonRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);

            if (!isInsideButton && !isInsideDropdown) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            isMountedRef.current = false;
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Reset mounted ref when closing
    useEffect(() => {
        if (!isOpen) {
            isMountedRef.current = true;
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => Math.min(prev + 1, visibleSprints.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter' && focusedIndex >= 0) {
            e.preventDefault();
            if (focusedIndex === 0) {
                onSelect(null);
            } else {
                const sprint = sprints[focusedIndex - 1];
                onSelect(sprint.id);
            }
            setIsOpen(false);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            buttonRef.current?.focus();
        }
    };

    const handleSelect = (sprintId: string | null) => {
        try {
            onSelect(sprintId);
        } catch (error) {
            console.error('Failed to select sprint:', error);
        } finally {
            setIsOpen(false);
            setFocusedIndex(-1);
        }
    };

    // Sort sprints: active first, then by startDate ascending (matching backend)
    // Filter out archived sprints from dropdown
    const visibleSprints = sprints.filter(s => s.status !== 'ARCHIVED');
    const sortedSprints = [...visibleSprints].sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });

    // Calculate dropdown position
    const getDropdownPosition = () => {
        if (!buttonRef.current) return { top: 0, left: 0 };
        const rect = buttonRef.current.getBoundingClientRect();
        return {
            top: rect.bottom + DROPDOWN_GAP,
            left: rect.left,
        };
    };

    const dropdownContent = isOpen ? (
        <div
            ref={dropdownRef}
            className="fixed w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[999999]"
            /* eslint-disable react-hooks/refs */
            style={getDropdownPosition()}
            onMouseDown={(e) => e.preventDefault()}
        >
            {/* All Tasks option */}
            <button
                onClick={() => handleSelect(null)}
                onMouseEnter={() => setFocusedIndex(0)}
                className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                    focusedIndex === 0 ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                } ${!activeSprintId ? 'text-accent-blue' : 'text-white'}`}
            >
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="font-medium">{UI_LABELS.ALL_TASKS}</span>
                {!activeSprintId && <Check className="w-4 h-4 ml-auto" />}
            </button>

            {sprints.length > 0 && (
                <div className="border-t border-white/5 my-1" />
            )}

            {/* Sprint list */}
            {sortedSprints.map((sprint, index) => {
                const listIndex = index + 1;
                const isActive = sprint.status === 'ACTIVE';
                const isSelected = sprint.id === activeSprintId;
                const color = getSprintColor(sprint, sprints);

                return (
                    <button
                        key={sprint.id}
                        onClick={() => handleSelect(sprint.id)}
                        onMouseEnter={() => setFocusedIndex(listIndex)}
                        className={`w-full px-4 py-2.5 text-left flex items-start gap-3 transition-colors ${
                            focusedIndex === listIndex ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                        } ${isSelected ? 'text-accent-blue' : 'text-white'}`}
                    >
                        <span
                            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                            style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{sprint.name}</span>
                                {isActive && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded">
                                        ACTIVE
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                                {formatSprintDateRange(sprint.startDate, sprint.endDate)}
                            </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                    </button>
                );
            })}

            {sprints.length === 0 && (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                    {UI_LABELS.NO_SPRINTS_YET}
                </div>
            )}
        </div>
    ) : null;

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-sm font-medium text-white ${
                    isOpen ? 'bg-slate-700' : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="flex items-center gap-2">
                    {activeSprint ? (
                        <>
                            <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: getSprintColor(activeSprint, sprints) }}
                            />
                            <span className="text-white">{activeSprint.name}</span>
                        </>
                    ) : (
                        <>
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                            <span className="text-slate-400">{UI_LABELS.ALL_TASKS}</span>
                        </>
                    )}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {createPortal(dropdownContent, document.body)}
        </div>
    );
};

export default SprintSwitcher;
