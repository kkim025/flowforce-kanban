import React from 'react';
import { useKanban } from '../../store/KanbanContext';
import { getActiveSprint } from '../../lib/sprint-utils';
import SprintSwitcher from './SprintSwitcher';
import SprintProgress from './SprintProgress';
import { UI_LABELS } from '../../lib/constants';

interface SprintFilterBarProps {
    boardId: string;
    onOpenSprintPanel: () => void;
    onOpenCreateSprint: () => void;
}

const SprintFilterBar: React.FC<SprintFilterBarProps> = ({
    boardId: _boardId,
    onOpenSprintPanel,
    onOpenCreateSprint,
}) => {
    const { state, dispatch } = useKanban();
    const { sprints, activeSprintId } = state;

    const activeSprint = activeSprintId
        ? sprints.find(s => s.id === activeSprintId)
        : getActiveSprint(sprints);

    const handleActiveSprintChange = (sprintId: string | null) => {
        dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId } });
    };

    return (
        <div className="mb-4 px-1">
            <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/5">
                {/* Left side: Sprint Switcher */}
                <div className="flex items-center gap-4">
                    <SprintSwitcher
                        sprints={sprints}
                        activeSprintId={activeSprintId}
                        onSelect={handleActiveSprintChange}
                    />

                    {activeSprint && (
                        <SprintProgress
                            sprint={activeSprint}
                            tasks={Object.values(state.tasks)}
                            columnOrder={state.columnOrder}
                        />
                    )}

                    {!activeSprint && (
                        <span className="text-sm text-slate-400 font-medium">
                            {UI_LABELS.ALL_TASKS}
                        </span>
                    )}
                </div>

                {/* Right side: Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenSprintPanel}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-all"
                    >
                        {UI_LABELS.MANAGE_SPRINTS}
                    </button>
                    <button
                        onClick={onOpenCreateSprint}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-accent-blue hover:bg-blue-600 rounded-lg transition-all flex items-center gap-1.5"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        {UI_LABELS.CREATE_SPRINT}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SprintFilterBar;