import React, { useState, useEffect } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useKanban } from '../store/KanbanContext';
import { useAuth } from '../store/AuthContext';
import Column from './Column';
import TaskModal from './TaskModal';
import { Task } from '../types';
import { motion } from 'framer-motion';
import { LogOut } from 'lucide-react';

const Board: React.FC = () => {
    const { state, dispatch, undo, redo, canUndo, canRedo } = useKanban();
    const { user, logout } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTask, setActiveTask] = useState<Task | undefined>(undefined);
    const [targetColumnId, setTargetColumnId] = useState('todo');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Undo: Ctrl + Z
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                if (canUndo) undo();
            }
            // Redo: Ctrl + Shift + Z or Ctrl + Y
            if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                if (canRedo) redo();
            }
            // New Task: 'n' (if not typing in an input)
            if (e.key === 'n' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                openCreateModal();
            }
            // Search: '/'
            if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo]);

    const onDragEnd = (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        dispatch({
            type: 'MOVE_TASK',
            payload: {
                taskId: draggableId,
                sourceColId: source.droppableId,
                destinationColId: destination.droppableId,
                sourceIndex: source.index,
                destinationIndex: destination.index,
            },
        });
    };

    const handleSaveTask = (task: Task) => {
        if (activeTask) {
            dispatch({ type: 'UPDATE_TASK', payload: { task } });
        } else {
            dispatch({ type: 'ADD_TASK', payload: { columnId: targetColumnId, task } });
        }
    };

    const openCreateModal = (columnId: string = 'todo') => {
        setTargetColumnId(columnId);
        setActiveTask(undefined);
        setIsModalOpen(true);
    };

    const openEditModal = (task: Task) => {
        setActiveTask(task);
        setIsModalOpen(true);
    };

    const handleDeleteTask = (taskId: string, columnId: string) => {
        dispatch({ type: 'DELETE_TASK', payload: { taskId, columnId } });
    };

    const handleSelectTask = (taskId: string, multiSelect: boolean) => {
        dispatch({ type: 'TOGGLE_SELECT_TASK', payload: { taskId, multiSelect } });
    };

    const handleDeleteSelected = () => {
        if (window.confirm(`Delete ${state.selectedTaskIds.length} selected tasks?`)) {
            state.selectedTaskIds.forEach(taskId => {
                // We need the columnId to delete properly in the current reducer
                // Let's find it.
                const columnId = Object.keys(state.columns).find(id =>
                    state.columns[id].taskIds.includes(taskId)
                );
                if (columnId) {
                    dispatch({ type: 'DELETE_TASK', payload: { taskId, columnId } });
                }
            });
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    };

    const handleMoveSelected = (destinationColId: string) => {
        state.selectedTaskIds.forEach(taskId => {
            const sourceColId = Object.keys(state.columns).find(id =>
                state.columns[id].taskIds.includes(taskId)
            );
            if (sourceColId && sourceColId !== destinationColId) {
                dispatch({
                    type: 'MOVE_TASK',
                    payload: {
                        taskId,
                        sourceColId,
                        destinationColId,
                        sourceIndex: state.columns[sourceColId].taskIds.indexOf(taskId),
                        destinationIndex: state.columns[destinationColId].taskIds.length,
                    }
                });
            }
        });
        dispatch({ type: 'CLEAR_SELECTION' });
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        document.documentElement.classList.toggle('dark', newMode);
    };

    const exportData = () => {
        const dataStr = JSON.stringify(state, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `flowforce-kanban-backup-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                dispatch({ type: 'SET_STATE', payload: json });
            } catch (err) {
                alert('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-8 h-full flex flex-col">
            <header className="flex justify-between items-end mb-12">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                        FlowForce<span className="text-accent-blue">.</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Streamline your workflow with precision.</p>
                </div>

                <div className="flex flex-col items-end gap-6">
                    <div className="relative group">
                        <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent-blue transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Press / to search..."
                            aria-label="Search tasks"
                            className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 w-64 focus:w-80 outline-none focus:ring-2 focus:ring-accent-blue/30 dark:text-white transition-all duration-300"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-slate-900/50 border border-white/20 rounded-xl mr-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[100px]">{user.name || user.email.split('@')[0]}</p>
                                    <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tighter flex items-center gap-1 transition-colors">
                                        <LogOut className="w-2.5 h-2.5" /> Log Out
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border border-white/20">
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500"
                                title="Toggle Theme"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 18v1m9-9h1M3 9h1m15.364 6.364l-.707.707M6.343 6.343l-.707.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>
                            <button
                                onClick={exportData}
                                className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500"
                                title="Export Data (JSON)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500"
                                title="Import Data (JSON)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={importData}
                                className="hidden"
                            />
                        </div>

                        <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border border-white/20">
                            <button
                                onClick={undo}
                                disabled={!canUndo}
                                className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                                title="Undo (Ctrl+Z)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo}
                                className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all"
                                title="Redo (Ctrl+Shift+Z)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                                </svg>
                            </button>
                        </div>

                        <button
                            onClick={() => openCreateModal()}
                            className="bg-accent-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            New Task
                        </button>
                    </div>
                </div>
            </header>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-8 overflow-x-auto pb-8 flex-1">
                    {state.columnOrder.map((columnId) => {
                        const column = state.columns[columnId];
                        const tasks = column.taskIds
                            .map((taskId) => state.tasks[taskId])
                            .filter(task => {
                                if (!searchQuery) return true;
                                const query = searchQuery.toLowerCase();
                                return (
                                    task.title.toLowerCase().includes(query) ||
                                    task.description.toLowerCase().includes(query) ||
                                    task.tags.some(t => t.toLowerCase().includes(query)) ||
                                    task.priority.toLowerCase().includes(query)
                                );
                            });

                        return (
                            <Column
                                key={column.id}
                                column={column}
                                tasks={tasks}
                                onAddTask={() => openCreateModal(column.id)}
                                onEditTask={openEditModal}
                                onDeleteTask={(taskId) => handleDeleteTask(taskId, column.id)}
                                selectedTaskIds={state.selectedTaskIds}
                                onSelectTask={handleSelectTask}
                            />
                        );
                    })}
                </div>
            </DragDropContext>

            {state.selectedTaskIds.length > 0 && (
                <motion.div
                    initial={{ y: 100 }}
                    animate={{ y: 0 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 glass border border-accent-blue/20 px-8 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[100] flex items-center gap-8"
                >
                    <div className="flex items-center gap-2">
                        <span className="bg-accent-blue text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                            {state.selectedTaskIds.length}
                        </span>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">Selected</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Move To:</span>
                        {state.columnOrder.map(colId => (
                            <button
                                key={colId}
                                onClick={() => handleMoveSelected(colId)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-accent-blue hover:text-white transition-all"
                            >
                                {state.columns[colId].title}
                            </button>
                        ))}
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-xl transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>

                        <button
                            onClick={() => dispatch({ type: 'CLEAR_SELECTION' })}
                            className="text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            )}

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTask}
                initialTask={activeTask}
            />
        </div>
    );
};

export default Board;
