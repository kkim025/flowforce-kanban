import React from 'react';
import { Layout, List } from 'lucide-react';
import { useKanban } from '../store/KanbanContext';
import { ViewMode } from '../types';

const ViewToggle: React.FC = () => {
    const { state, dispatch } = useKanban();

    const handleToggle = (mode: ViewMode) => {
        dispatch({ type: 'SET_VIEW_MODE', payload: mode });
    };

    return (
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
            <button
                onClick={() => handleToggle('board')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${state.viewMode === 'board' 
                        ? 'bg-white dark:bg-slate-800 text-accent-blue shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                `}
            >
                <Layout className="w-3.5 h-3.5" />
                Board
            </button>
            <button
                onClick={() => handleToggle('list')}
                className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all
                    ${state.viewMode === 'list' 
                        ? 'bg-white dark:bg-slate-800 text-accent-blue shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}
                `}
            >
                <List className="w-3.5 h-3.5" />
                List
            </button>
        </div>
    );
};

export default ViewToggle;
