import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { UI_LABELS } from '../lib/constants';

interface TaskEditorHeaderProps {
    isEditing: boolean;
    onSave: () => void;
    canSave: boolean;
}

const TaskEditorHeader: React.FC<TaskEditorHeaderProps> = ({
    isEditing,
    onSave,
    canSave,
}) => {
    const navigate = useNavigate();

    return (
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                    {isEditing ? UI_LABELS.EDIT_TASK : UI_LABELS.CREATE_TASK}
                </h1>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onSave}
                    disabled={!canSave}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs disabled:opacity-50"
                >
                    <Save className="w-3.5 h-3.5" />
                    {UI_LABELS.SAVE_TASK}
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                    onClick={() => navigate('/')}
                    className="p-2 text-slate-400 hover:text-accent-blue transition-colors"
                    title={UI_LABELS.CLOSE}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default TaskEditorHeader;