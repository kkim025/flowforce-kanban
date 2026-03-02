import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useKanban } from '../store/KanbanContext';
import { Task, Priority } from '../types';
import { motion } from 'framer-motion';
import { ArrowUp, ArrowDown, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SortField = 'title' | 'columnTitle' | 'priority' | 'progress' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ROW_HEIGHT = 72; // Height of each row in pixels
const BUFFER_ROWS = 5; // Number of rows to render above and below the visible area

interface ListViewProps {
    onTaskClick?: (task: Task) => void;
}

const ListView: React.FC<ListViewProps> = ({ onTaskClick }) => {
    const { state } = useKanban();
    const navigate = useNavigate();
    const [sortField, setSortField] = useState<SortField>('createdAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(600);
    
    // Update container height on resize
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                setContainerHeight(containerRef.current.clientHeight);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // Flatten and Filter tasks
    const filteredTasks = useMemo(() => {
        const tasks: (Task & { columnTitle: string; progress: number; completedCount: number; totalCount: number })[] = [];
        
        state.columnOrder.forEach(colId => {
            const column = state.columns[colId];
            column.taskIds.forEach(taskId => {
                const task = state.tasks[taskId];
                if (task && !task.isArchived) {
                    const completed = task.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.isCompleted).length, 0) || 
                                    (task.subTasks?.filter(st => st.isCompleted).length || 0);
                    const total = task.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 
                                 (task.subTasks?.length || 0);
                    const progress = total > 0 ? (completed / total) * 100 : 0;

                    const query = (state.searchQuery || '').toLowerCase();
                    const matchesSearch = !query || 
                        (task.title || '').toLowerCase().includes(query) ||
                        (task.description || '').toLowerCase().includes(query) ||
                        (task.tags || []).some(t => (t || '').toLowerCase().includes(query)) ||
                        (column.title || '').toLowerCase().includes(query);

                    if (matchesSearch) {
                        tasks.push({
                            ...task,
                            columnTitle: column.title,
                            progress,
                            completedCount: completed,
                            totalCount: total
                        });
                    }
                }
            });
        });

        // Sort
        return tasks.sort((a, b) => {
            let comparison = 0;
            if (sortField === 'priority') {
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                comparison = priorityWeight[a.priority] - priorityWeight[b.priority];
            } else if (sortField === 'progress') {
                comparison = a.progress - b.progress;
            } else if (sortField === 'createdAt') {
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else {
                comparison = String(a[sortField]).localeCompare(String(b[sortField]));
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }, [state.tasks, state.columns, state.columnOrder, state.searchQuery, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const getPriorityColor = (priority: Priority) => {
        switch (priority) {
            case 'high': return 'text-red-500 bg-red-500/10';
            case 'medium': return 'text-amber-500 bg-amber-500/10';
            case 'low': return 'text-emerald-500 bg-emerald-500/10';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 inline" /> : <ArrowDown className="w-3 h-3 ml-1 inline" />;
    };

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    // Calculate virtualization range
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endIndex = Math.min(filteredTasks.length, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + BUFFER_ROWS);
    const visibleTasks = filteredTasks.slice(startIndex, endIndex);
    const totalHeight = filteredTasks.length * ROW_HEIGHT;
    const offsetY = startIndex * ROW_HEIGHT;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full px-4 py-6 md:px-8 flex flex-col overflow-hidden"
        >
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/20 shadow-lg overflow-hidden flex flex-col flex-1">
                {/* Horizontal Scroll Container for the whole table */}
                <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
                    <div className="min-w-[900px] flex flex-col flex-1">
                        {/* Header */}
                        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 font-bold text-[10px] uppercase tracking-widest text-slate-400 z-10 sticky top-0">
                            <div className="flex-1 px-8 py-5 cursor-pointer hover:text-accent-blue transition-colors flex items-center" onClick={() => handleSort('title')}>
                                Task Title <SortIcon field="title" />
                            </div>
                            <div className="w-48 px-6 py-5 cursor-pointer hover:text-accent-blue transition-colors flex items-center" onClick={() => handleSort('columnTitle')}>
                                Status <SortIcon field="columnTitle" />
                            </div>
                            <div className="w-36 px-6 py-5 cursor-pointer hover:text-accent-blue transition-colors flex items-center" onClick={() => handleSort('priority')}>
                                Priority <SortIcon field="priority" />
                            </div>
                            <div className="w-56 px-6 py-5 cursor-pointer hover:text-accent-blue transition-colors flex items-center" onClick={() => handleSort('progress')}>
                                Progress <SortIcon field="progress" />
                            </div>
                            <div className="w-40 px-8 py-5 text-right cursor-pointer hover:text-accent-blue transition-colors flex items-center justify-end" onClick={() => handleSort('createdAt')}>
                                Created <SortIcon field="createdAt" />
                            </div>
                        </div>

                        {/* Virtualized Body */}
                        <div 
                            ref={containerRef}
                            className="flex-1 overflow-y-auto custom-scrollbar relative"
                            onScroll={handleScroll}
                        >
                            {filteredTasks.length > 0 ? (
                                <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
                                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                                        {visibleTasks.map((task) => (
                                            <div 
                                                key={task.id} 
                                                onClick={() => navigate(`/tasks/${task.id}`)}
                                                className="flex items-center border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                                                style={{ height: `${ROW_HEIGHT}px` }}
                                            >
                                                <div className="flex-1 px-8 py-4 flex flex-col justify-center min-w-0">
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-accent-blue transition-colors truncate">
                                                        {task.title}
                                                    </span>
                                                    {(task.tags || []).length > 0 && (
                                                        <div className="flex gap-1.5 mt-1.5 overflow-hidden">
                                                            {(task.tags || []).map(tag => (
                                                                <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-medium flex-shrink-0">#{tag}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-48 px-6 py-4 flex items-center">
                                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase truncate">
                                                        {task.columnTitle}
                                                    </span>
                                                </div>
                                                <div className="w-36 px-6 py-4 flex items-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                </div>
                                                <div className="w-56 px-6 py-4 flex items-center gap-4">
                                                    <div className="w-32 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex-shrink-0">
                                                        <div 
                                                            className={`h-full transition-all duration-500 ${task.progress === 100 ? 'bg-emerald-500' : 'bg-accent-blue'}`}
                                                            style={{ width: `${task.progress}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-400 flex-shrink-0">
                                                        {task.completedCount}/{task.totalCount}
                                                    </span>
                                                </div>
                                                <div className="w-40 px-8 py-4 text-right flex items-center justify-end">
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-20 text-center">
                                    <div className="text-slate-300 dark:text-slate-700 mb-4">
                                        {state.searchQuery ? <Search className="w-16 h-16 mx-auto opacity-20" /> : (
                                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                            </svg>
                                        )}
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-400">
                                        {state.searchQuery ? 'No matches found' : 'No tasks found'}
                                    </h3>
                                    <p className="text-sm text-slate-400/60">
                                        {state.searchQuery ? 'Try adjusting your search query' : 'Start by creating a task on the board.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ListView;
