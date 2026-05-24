import React from 'react';
import { CheckSquare, CheckCircle2, Circle } from 'lucide-react';
import { Checklist } from '../types';

interface ChecklistSectionProps {
    checklists: Checklist[];
    onToggleChecklistItem: (checklistId: string, itemId: string) => void;
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({ checklists, onToggleChecklistItem }) => {
    if (!checklists || checklists.length === 0) return null;

    // Filter out checklists with no items for display
    const nonEmptyChecklists = checklists.filter(cl => cl.items.length > 0);
    if (nonEmptyChecklists.length === 0) return null;

    return (
        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-3">
                <CheckSquare className="w-4 h-4 text-accent-blue" />
                Checklists
            </h3>

            <div className="space-y-6">
                {nonEmptyChecklists.map((cl) => (
                    <div key={cl.id} className="glass rounded-2xl border border-white/5 overflow-hidden bg-slate-50/50 dark:bg-white/5">
                        <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">{cl.title}</h4>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                    {cl.items.filter(i => i.isCompleted).length} / {cl.items.length}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                                <div 
                                    className="h-full bg-accent-blue transition-all duration-500"
                                    style={{ width: `${cl.items.length > 0 ? (cl.items.filter(i => i.isCompleted).length / cl.items.length) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-5 space-y-3">
                            {cl.items.map(item => (
                                <div key={item.id} className="flex items-center gap-3 group">
                                    <button onClick={() => onToggleChecklistItem(cl.id, item.id)}>
                                        {item.isCompleted ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                                    </button>
                                    <span className={`text-sm flex-1 ${item.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {item.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChecklistSection;
