import React from 'react';
import { Sprint } from '../../types';
import { getSprintColor } from '../../lib/sprint-utils';

interface SprintBadgeProps {
    sprint: Sprint;
    sprintIndex: number;
    compact?: boolean;
    onClick?: () => void;
}

const SprintBadge: React.FC<SprintBadgeProps> = ({
    sprint,
    sprintIndex,
    compact = false,
    onClick,
}) => {
    const color = getSprintColor(sprintIndex);

    if (compact) {
        return (
            <button
                onClick={onClick}
                className="flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title={`Sprint: ${sprint.name}`}
            >
                <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                />
                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[80px]">
                    {sprint.name}
                </span>
            </button>
        );
    }

    return (
        <div className="flex items-center gap-2 text-xs">
            <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
            />
            <span className="font-medium text-slate-700 dark:text-slate-200">
                {sprint.name}
            </span>
            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wide ${
                sprint.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-500' :
                sprint.status === 'COMPLETED' ? 'bg-slate-500/20 text-slate-500' :
                'bg-blue-500/20 text-blue-500'
            }`}>
                {sprint.status.toLowerCase()}
            </span>
        </div>
    );
};

export default SprintBadge;
