import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Archive, Trash2, X, Hash } from 'lucide-react';
import { Task } from '../types';
import { UI_LABELS } from '../lib/constants';

interface TaskViewerHeaderProps {
    task: Task;
    onArchive: () => void;
    onDelete: () => void;
    onShowDeleteConfirm: () => void;
}

const TaskViewerHeader: React.FC<TaskViewerHeaderProps> = ({
    task,
    onArchive,
    onShowDeleteConfirm,
}) => {
    const navigate = useNavigate();

    return (
        <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <Hash className="w-3.5 h-3.5" />
                {task.id.slice(0, 8)}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => navigate(`/tasks/${task.id}/edit`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    {UI_LABELS.EDIT}
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                    onClick={onArchive}
                    className="p-2 text-slate-400 hover:text-amber-500 transition-colors"
                    title="Archive Task"
                >
                    <Archive className="w-4 h-4" />
                </button>
                <button
                    onClick={onShowDeleteConfirm}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete Task"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10 mx-1" />
                <button
                    onClick={() => navigate('/')}
                    className="p-2 text-slate-400 hover:text-accent-blue transition-colors"
                    title="Close Drawer"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default TaskViewerHeader;