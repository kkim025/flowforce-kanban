import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Sprint } from '../../types';
import { createSprint, updateSprint } from '../../lib/api';
import { useKanban } from '../../store/KanbanContext';
import { UI_LABELS, SPRINT_COLORS, DEFAULT_CUSTOM_COLOR } from '../../lib/constants';
import { X } from 'lucide-react';

interface SprintFormData {
    name: string;
    startDate: string;
    endDate: string;
    color?: string;
}

interface CreateSprintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (sprint: Sprint) => void;
    boardId: string;
    editSprint?: Sprint;
    onArchive?: (sprint: Sprint) => void;
}

const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
    isOpen,
    onClose,
    onCreated,
    boardId,
    editSprint,
    onArchive,
}) => {
    const { dispatch } = useKanban();
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [color, setColor] = useState<string | undefined>(undefined);
    const [customColor, setCustomColor] = useState(DEFAULT_CUSTOM_COLOR);
    const [showCustomColorInput, setShowCustomColorInput] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isEditing = !!editSprint;

    useEffect(() => {
        if (editSprint) {
            setName(editSprint.name);
            setStartDate(editSprint.startDate.split('T')[0]);
            setEndDate(editSprint.endDate.split('T')[0]);
            setColor(editSprint.color);
            if (editSprint.color && !SPRINT_COLORS.includes(editSprint.color)) {
                setCustomColor(editSprint.color);
                setShowCustomColorInput(true);
            }
        } else {
            // Default dates: today to 2 weeks from now
            const today = new Date();
            const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
            setStartDate(today.toISOString().split('T')[0]);
            setEndDate(twoWeeksLater.toISOString().split('T')[0]);
            setName('');
            setColor(undefined);
            setShowCustomColorInput(false);
            setCustomColor(DEFAULT_CUSTOM_COLOR);
        }
        setError(null);
    }, [editSprint, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!name.trim()) {
            setError('Sprint name is required');
            return;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (end <= start) {
            setError('End date must be after start date');
            return;
        }

        // Validate custom color format
        if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
            setError('Invalid color format. Use hex format #RRGGBB');
            return;
        }

        setIsSubmitting(true);

        try {
            let sprint: Sprint;

            if (isEditing && editSprint) {
                const updateData: SprintFormData = {
                    name: name.trim(),
                    startDate: startDate,
                    endDate: endDate,
                    color: color !== undefined ? color : undefined,
                };
                sprint = await updateSprint(editSprint.id, updateData);
                dispatch({ type: 'UPDATE_SPRINT', payload: { sprint } });
            } else {
                const createData: SprintFormData = {
                    name: name.trim(),
                    startDate: startDate,
                    endDate: endDate,
                    color: color !== undefined ? color : undefined,
                };
                sprint = await createSprint(boardId, createData);
                dispatch({ type: 'ADD_SPRINT', payload: { sprint } });
            }

            onCreated(sprint);
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save sprint');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white">
                                {isEditing ? UI_LABELS.EDIT_SPRINT : UI_LABELS.CREATE_SPRINT}
                            </h3>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            {isEditing && editSprint?.status === 'ARCHIVED' && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm">
                                    Archived sprints cannot be edited.
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    {UI_LABELS.SPRINT_NAME}
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Sprint 1, Week 1, March Sprint"
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                                    autoFocus
                                    disabled={isEditing && editSprint?.status === 'ARCHIVED'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    {UI_LABELS.START_DATE}
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                                    disabled={isEditing && editSprint?.status === 'ARCHIVED'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    {UI_LABELS.END_DATE}
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                                    disabled={isEditing && editSprint?.status === 'ARCHIVED'}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Color
                                </label>
                                <div className="space-y-3">
                                    {/* Auto option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setColor(undefined);
                                            setShowCustomColorInput(false);
                                            setCustomColor(DEFAULT_CUSTOM_COLOR);
                                        }}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            color === undefined
                                                ? 'bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500 text-white ring-2 ring-offset-2 ring-accent-blue dark:ring-offset-slate-900'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        Auto (algorithmic)
                                    </button>

                                    {/* Predefined colors */}
                                    <div className="grid grid-cols-8 gap-2">
                                        {SPRINT_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => {
                                                    setColor(c);
                                                    setShowCustomColorInput(false);
                                                }}
                                                className={`h-10 rounded-lg transition-all ${
                                                    color === c
                                                        ? 'ring-2 ring-offset-2 ring-accent-blue dark:ring-offset-slate-900 scale-110'
                                                        : 'hover:scale-110'
                                                }`}
                                                style={{ backgroundColor: c }}
                                                title={c}
                                            />
                                        ))}
                                    </div>

                                    {/* Custom color option */}
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomColorInput(!showCustomColorInput)}
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                            showCustomColorInput && color && !SPRINT_COLORS.includes(color)
                                                ? 'ring-2 ring-offset-2 ring-accent-blue dark:ring-offset-slate-900'
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        Custom Color
                                    </button>

                                    {/* Custom color input */}
                                    {showCustomColorInput && (
                                        <div className="flex gap-2 items-center">
                                            <div className="relative flex-1">
                                                <input
                                                    type="color"
                                                    value={customColor}
                                                    onChange={(e) => {
                                                        setCustomColor(e.target.value);
                                                        setColor(e.target.value);
                                                    }}
                                                    className="w-full h-10 rounded-lg cursor-pointer border-0"
                                                />
                                                <input
                                                    type="text"
                                                    value={customColor}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        if (/^#[0-9A-Fa-f]{6}$/.test(value) || value === '') {
                                                            setCustomColor(value || DEFAULT_CUSTOM_COLOR);
                                                            setColor(value || undefined);
                                                        }
                                                    }}
                                                    placeholder="#RRGGBB"
                                                    className="absolute inset-0 w-full h-10 px-2 bg-transparent rounded-lg text-xs font-mono text-center focus:outline-none"
                                                    maxLength={7}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 rounded-2xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                            >
                                {UI_LABELS.CANCEL}
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 px-4 py-3 rounded-2xl font-bold text-sm text-white bg-accent-blue hover:bg-blue-600 transition-all shadow-lg shadow-accent-blue/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    isEditing ? UI_LABELS.SAVE : UI_LABELS.CREATE_SPRINT
                                )}
                            </button>
                            {isEditing && editSprint?.status !== 'ARCHIVED' && onArchive && (
                                <button
                                    type="button"
                                    onClick={() => onArchive(editSprint!)}
                                    className="flex-1 px-4 py-3 rounded-2xl font-bold text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-all"
                                >
                                    Archive Sprint
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default CreateSprintModal;
