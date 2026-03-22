import React, { useState } from 'react';
import { Sprint, SprintStatus } from '../../types';
import { activateSprint, deleteSprint } from '../../lib/api';
import { useKanban } from '../../store/KanbanContext';
import { getSprintColor, formatSprintDateRange } from '../../lib/sprint-utils';
import { UI_LABELS } from '../../lib/constants';
import ConfirmationModal from '../ConfirmationModal';
import CreateSprintModal from './CreateSprintModal';
import { X, Calendar, Play, CheckCircle, Eye, Trash2, Edit2 } from 'lucide-react';

interface SprintPanelProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
}

const SprintPanel: React.FC<SprintPanelProps> = ({
    isOpen,
    onClose,
    boardId,
}) => {
    const { state, dispatch } = useKanban();
    const { sprints, activeSprintId } = state;

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Sort sprints: ACTIVE first, then by startDate descending (most recent first)
    const sortedSprints = [...sprints].sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    const handleActivate = async (sprint: Sprint) => {
        try {
            const updated = await activateSprint(sprint.id);
            // Update this sprint in state
            dispatch({ type: 'UPDATE_SPRINT', payload: { sprint: updated } });
            // Update all other sprints - set any that were ACTIVE to COMPLETED
            sprints.forEach(s => {
                if (s.id !== sprint.id && s.status === 'ACTIVE') {
                    dispatch({ type: 'UPDATE_SPRINT', payload: { sprint: { ...s, status: 'COMPLETED' as SprintStatus } } });
                }
            });
            // Set active sprint
            dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId: updated.id } });
        } catch (err) {
            console.error('Failed to activate sprint:', err);
        }
    };

    const handleComplete = async (sprint: Sprint) => {
        // For now, just mark as completed via update
        try {
            const updated = await activateSprint(sprint.id);
            dispatch({ type: 'UPDATE_SPRINT', payload: { sprint: updated } });
            if (activeSprintId === sprint.id) {
                dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId: null } });
            }
        } catch (err) {
            console.error('Failed to complete sprint:', err);
        }
    };

    const handleDelete = async () => {
        if (!deletingSprint) return;
        setIsDeleting(true);
        try {
            await deleteSprint(deletingSprint.id);
            dispatch({ type: 'DELETE_SPRINT', payload: { sprintId: deletingSprint.id } });
            if (activeSprintId === deletingSprint.id) {
                dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId: null } });
            }
            setDeletingSprint(null);
        } catch (err) {
            console.error('Failed to delete sprint:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSprintCreated = (sprint: Sprint) => {
        // Sprint already added via dispatch in the modal
    };

    const handleEdit = (sprint: Sprint) => {
        setEditingSprint(sprint);
        setIsCreateModalOpen(true);
    };

    const handleCreateModalClose = () => {
        setIsCreateModalOpen(false);
        setEditingSprint(null);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[1000] transition-colors"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white dark:bg-slate-950 shadow-2xl z-[1001] flex flex-col border-l border-slate-200 dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-blue/10 rounded-xl">
                            <Calendar className="w-5 h-5 text-accent-blue" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">
                            {UI_LABELS.SPRINT}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {/* Create button */}
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="w-full mb-4 px-4 py-3 bg-accent-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        {UI_LABELS.CREATE_SPRINT}
                    </button>

                    {/* Sprint list */}
                    {sortedSprints.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm">{UI_LABELS.NO_SPRINTS_YET}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedSprints.map((sprint) => {
                                const sprintIndex = sprints.indexOf(sprint);
                                const color = getSprintColor(sprintIndex);
                                const isActive = sprint.status === 'ACTIVE';
                                const isCompleted = sprint.status === 'COMPLETED';

                                return (
                                    <div
                                        key={sprint.id}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isActive
                                                ? 'bg-accent-blue/5 border-accent-blue/20'
                                                : 'bg-slate-50 dark:bg-slate-900/50 border-transparent hover:border-slate-200 dark:hover:border-white/10'
                                        }`}
                                    >
                                        {/* Sprint header */}
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: color }}
                                                />
                                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                                    {sprint.name}
                                                </span>
                                            </div>
                                            {isActive && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-400 rounded-full">
                                                    ACTIVE
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-500/20 text-slate-400 rounded-full">
                                                    COMPLETED
                                                </span>
                                            )}
                                        </div>

                                        {/* Date range */}
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 pl-5">
                                            {formatSprintDateRange(sprint.startDate, sprint.endDate)}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-2 pl-5">
                                            {sprint.status === 'PLANNING' && (
                                                <>
                                                    <button
                                                        onClick={() => handleActivate(sprint)}
                                                        className="flex-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <Play className="w-3 h-3" />
                                                        {UI_LABELS.ACTIVATE}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(sprint)}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingSprint(sprint)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {sprint.status === 'ACTIVE' && (
                                                <>
                                                    <button
                                                        onClick={() => handleComplete(sprint)}
                                                        className="flex-1 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <CheckCircle className="w-3 h-3" />
                                                        {UI_LABELS.COMPLETE}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(sprint)}
                                                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingSprint(sprint)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}

                                            {sprint.status === 'COMPLETED' && (
                                                <>
                                                    <button
                                                        onClick={() => dispatch({ type: 'SET_ACTIVE_SPRINT', payload: { sprintId: sprint.id } })}
                                                        className="flex-1 px-3 py-1.5 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                        {UI_LABELS.VIEW}
                                                    </button>
                                                    <button
                                                        onClick={() => setDeletingSprint(sprint)}
                                                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-500 transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create/Edit Sprint Modal */}
            <CreateSprintModal
                isOpen={isCreateModalOpen}
                onClose={handleCreateModalClose}
                onCreated={handleSprintCreated}
                boardId={boardId}
                editSprint={editingSprint || undefined}
            />

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={!!deletingSprint}
                title="Delete Sprint"
                message={`Delete sprint '${deletingSprint?.name}'? Tasks will be unassigned but not deleted.`}
                confirmLabel={UI_LABELS.DELETE}
                cancelLabel={UI_LABELS.CANCEL}
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setDeletingSprint(null)}
            />
        </>
    );
};

export default SprintPanel;
