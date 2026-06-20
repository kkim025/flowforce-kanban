import React from 'react';
import { Plus, X, CheckSquare } from 'lucide-react';
import { Checklist, SubTask } from '../types';
import { UI_LABELS } from '../lib/constants';

interface TaskEditorChecklistsProps {
    checklists: Checklist[];
    onAddChecklist: () => void;
    onRemoveChecklist: (id: string) => void;
    onUpdateChecklistTitle: (id: string, newTitle: string) => void;
    onAddSubTask: (checklistId: string) => void;
    onUpdateSubTask: (checklistId: string, itemId: string, updates: Partial<SubTask>) => void;
    onRemoveSubTask: (checklistId: string, itemId: string) => void;
}

const TaskEditorChecklists: React.FC<TaskEditorChecklistsProps> = ({
    checklists,
    onAddChecklist,
    onRemoveChecklist,
    onUpdateChecklistTitle,
    onAddSubTask,
    onUpdateSubTask,
    onRemoveSubTask,
}) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <CheckSquare className="w-3.5 h-3.5" />
                    {UI_LABELS.CHECKLISTS}
                </label>
                <button
                    onClick={onAddChecklist}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-[10px] font-bold text-slate-600 dark:text-slate-400 transition-all"
                >
                    <Plus className="w-3 h-3" /> {UI_LABELS.ADD_CHECKLIST}
                </button>
            </div>

            <div className="space-y-6">
                {checklists.map((cl) => (
                    <div key={cl.id} className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/5">
                        <div className="px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-white/5 flex items-center gap-3">
                            <input
                                type="text"
                                value={cl.title}
                                onChange={(e) => onUpdateChecklistTitle(cl.id, e.target.value)}
                                className="flex-1 bg-transparent border-none p-0 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none"
                            />
                            <button onClick={() => onRemoveChecklist(cl.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-5 space-y-3">
                            {cl.items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 group">
                                    <input
                                        type="checkbox"
                                        checked={item.isCompleted}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onUpdateSubTask(cl.id, item.id, { isCompleted: e.target.checked });
                                        }}
                                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-accent-blue focus:ring-accent-blue/30 bg-transparent"
                                    />
                                    <input
                                        type="text"
                                        value={item.title}
                                        onChange={(e) => {
                                            e.stopPropagation();
                                            onUpdateSubTask(cl.id, item.id, { title: e.target.value });
                                        }}
                                        placeholder="Item description..."
                                        className={`flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 outline-none ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}
                                    />
                                    <button onClick={() => onRemoveSubTask(cl.id, item.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => onAddSubTask(cl.id)}
                                className="flex items-center gap-2 text-xs font-bold text-accent-blue hover:underline mt-2"
                            >
                                <Plus className="w-3.5 h-3.5" /> {UI_LABELS.ADD_ITEM}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskEditorChecklists;