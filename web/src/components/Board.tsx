import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { DragDropContext, DropResult, Droppable } from '@hello-pangea/dnd';
import { useKanban } from '../store/KanbanContext';
import { useTags } from '../store/TagsContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../store/AuthContext';
import Column from './Column';
import ListView from './ListView';
import ViewToggle from './ViewToggle';
import { Task, Column as ColumnType, DueDateFilter } from '../types';
import { DUE_DATE_FILTER_OPTIONS, UI_LABELS } from '../lib/constants';
import { taskMatchesFilters } from '../lib/filter-utils';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, X, Check, Trash2, Users, BookOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, Outlet, useLocation, Link } from 'react-router-dom';
import Drawer from './Drawer';
import SprintFilterBar from './sprints/SprintFilterBar';
import FilterBar from './FilterBar';
import SprintPanel from './sprints/SprintPanel';
import CreateSprintModal from './sprints/CreateSprintModal';
import BoardPanel from './boards/BoardPanel';
import { NotificationBell } from './notifications/NotificationBell';
import { useKeyboardNavigation, NavigationDirection } from '../hooks/useKeyboardNavigation';

const Board: React.FC = () => {
    const { state, dispatch, undo, redo, canUndo, canRedo, isHydrated, activeBoardId, allBoards, setActiveBoard, deleteBoard, addBoard, renameBoard } = useKanban();
    const { showToast } = useToast();
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { refresh: refreshTags } = useTags();
    const navigate = useNavigate();
    const location = useLocation();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Drawer state
    const isDrawerOpen = useMemo(() => location.pathname.includes('/tasks/') || location.pathname.includes('/admin/'), [location.pathname]);

    // Sprint panel state
    const [isSprintPanelOpen, setIsSprintPanelOpen] = useState(false);
    const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);

    // Refresh the tag library whenever the active board changes (issue #32).
    // Depend on `refreshTags` (a stable useCallback in TagsContext), not the
    // whole context value object — depending on `tags` would re-fire on every
    // render and trigger an unbounded GET /tags loop.
    useEffect(() => {
        if (activeBoardId) {
            refreshTags(activeBoardId);
        } else {
            refreshTags('');
        }
    }, [activeBoardId, refreshTags]);

    // Board panel state
    const [isBoardPanelOpen, setIsBoardPanelOpen] = useState(false);

    // Column Management
    const [isAddingColumn, setIsAddingColumn] = useState(false);
    const [isSavingColumn, setIsSavingColumn] = useState(false);
    const [newColumnTitle, setNewColumnTitle] = useState('');
    const addColumnInputRef = useRef<HTMLInputElement>(null);

    // Keyboard navigation cursor (REV-3)
    // Cursor is identified by {columnId, taskIndexInColumn}
    const [focusedCard, setFocusedCard] = useState<{ columnId: string; taskId: string } | null>(null);

    // Grab to scroll logic
    const [isDragging, setIsDragging] = useState(false);
    const [isDndActive, setIsDndActive] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current || isDndActive) return;

        // Check if we are clicking on any DND related element or interactive UI
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, [data-rbd-draggable-id], [data-rbd-drag-handle-draggable-id], [data-rbd-droppable-id], .glass')) {
            if (!target.classList.contains('custom-scrollbar')) {
                return;
            }
        }
        
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDragging(false);
    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current || isDndActive) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
    };

    // openCreateView must be defined before useEffect that references it
    const openCreateView = useCallback((columnId?: string) => {
        const finalColumnId = columnId || state.columnOrder[0] || 'todo';
        navigate(`/tasks/new?columnId=${finalColumnId}`);
    }, [state.columnOrder, navigate]);

    // Compute visible tasks per column (shared by render and keyboard nav)
    const visibleTasksByColumn = useMemo(() => {
        const result: Record<string, Task[]> = {};
        state.columnOrder.forEach((columnId) => {
            const column = state.columns[columnId];
            const tasks = column.taskIds
                .map((taskId) => state.tasks[taskId])
                .filter(task => task && !task.isArchived)
                .filter(task => {
                    if (state.activeSprintId !== null) {
                        if (task.sprintId && task.sprintId !== state.activeSprintId) return false;
                    }
                    if (state.dueDateFilter !== 'all') {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const todayTime = today.getTime();
                        const weekEnd = new Date(today);
                        weekEnd.setDate(weekEnd.getDate() + 7);
                        const taskDate = task.dueDate ? new Date(task.dueDate) : null;
                        const taskDateTime = taskDate ? new Date(taskDate.getTime()).setHours(0, 0, 0, 0) : null;
                        switch (state.dueDateFilter) {
                            case 'overdue': return taskDateTime !== null && taskDateTime < todayTime;
                            case 'dueToday': return taskDateTime === todayTime;
                            case 'dueThisWeek': return taskDateTime !== null && taskDateTime >= todayTime && taskDateTime <= weekEnd.getTime();
                            case 'noDate': return taskDateTime === null;
                            default: return true;
                        }
                    }
                    if (!state.searchQuery) return true;
                    const query = state.searchQuery.toLowerCase();
                    return (
                        task.title.toLowerCase().includes(query) ||
                        task.description.toLowerCase().includes(query) ||
                        task.tags.some(t => t.name.toLowerCase().includes(query)) ||
                        task.priority.toLowerCase().includes(query)
                    );
                })
                .filter(task => taskMatchesFilters(task, {
                    assigneeFilter: state.assigneeFilter,
                    priorityFilter: state.priorityFilter,
                    tagFilter: state.tagFilter,
                }));
            result[columnId] = tasks;
        });
        return result;
    }, [state.columnOrder, state.columns, state.tasks, state.activeSprintId, state.dueDateFilter, state.searchQuery, state.assigneeFilter, state.priorityFilter, state.tagFilter]);

    // Flat list of all visible tasks in board order — used for j/k wrap navigation
    const flatVisibleTasks = useMemo(() => {
        const list: { columnId: string; task: Task }[] = [];
        state.columnOrder.forEach((columnId) => {
            (visibleTasksByColumn[columnId] || []).forEach((task) => {
                list.push({ columnId, task });
            });
        });
        return list;
    }, [visibleTasksByColumn, state.columnOrder]);

    // REV-3: Full Keyboard Navigation
    const handleCardNavigation = useCallback((direction: NavigationDirection) => {
        if (flatVisibleTasks.length === 0) return;


        if (direction === 'left' || direction === 'right') {
            // Column navigation: move to first card in adjacent column, preserving row if possible
            const currentColumnId = focusedCard?.columnId
                ?? (flatVisibleTasks[0]?.columnId);
            const currentColIdx = state.columnOrder.indexOf(currentColumnId || '');
            if (currentColIdx < 0) return;

            const targetColIdx = direction === 'left' ? currentColIdx - 1 : currentColIdx + 1;
            if (targetColIdx < 0 || targetColIdx >= state.columnOrder.length) return; // no wrap on columns

            const targetColumnId = state.columnOrder[targetColIdx];
            const targetColTasks = visibleTasksByColumn[targetColumnId] || [];
            if (targetColTasks.length === 0) return;

            // Preserve row position from the current column if possible
            const currentColTasks = visibleTasksByColumn[currentColumnId] || [];
            const currentRow = focusedCard
                ? currentColTasks.findIndex(t => t.id === focusedCard.taskId)
                : 0;
            const targetRow = Math.min(currentRow >= 0 ? currentRow : 0, targetColTasks.length - 1);
            setFocusedCard({ columnId: targetColumnId, taskId: targetColTasks[targetRow].id });
            return;
        }

        // j/k: vim-style card navigation (with wrap within board)
        if (flatVisibleTasks.length === 0) return;

        const currentIdx = focusedCard
            ? flatVisibleTasks.findIndex(item => item.task.id === focusedCard.taskId)
            : -1;

        let nextIdx: number;
        if (direction === 'down') {
            nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % flatVisibleTasks.length;
        } else {
            nextIdx = currentIdx <= 0
                ? flatVisibleTasks.length - 1
                : currentIdx - 1;
        }
        const next = flatVisibleTasks[nextIdx];
        setFocusedCard({ columnId: next.columnId, taskId: next.task.id });
    }, [flatVisibleTasks, focusedCard, state.columnOrder, visibleTasksByColumn]);

    const handleEnter = useCallback(() => {
        if (!focusedCard) return;
        const task = state.tasks[focusedCard.taskId];
        if (task) navigate(`/tasks/${task.id}`);
    }, [focusedCard, state.tasks, navigate]);

    const handleEscape = useCallback(() => {
        // Close the task drawer (escape) — also clear cursor
        if (isDrawerOpen) {
            navigate('/');
        }
        setFocusedCard(null);
    }, [isDrawerOpen, navigate]);

    useKeyboardNavigation({
        onNavigate: handleCardNavigation,
        onEnter: handleEnter,
        onEscape: handleEscape,
        disabled: isDrawerOpen, // disable nav while drawer open (Escape still works via dispatch path)
        containerRef: scrollContainerRef,
    });

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                if (canUndo) undo();
            }
            if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
                if (canRedo) redo();
            }
            if (e.key === 'n' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                openCreateView();
            }
            if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, canUndo, canRedo, openCreateView]);

    const onDragEnd = (result: DropResult) => {
        setIsDndActive(false);
        const { destination, source, draggableId, type } = result;

        if (!destination) return;

        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        if (type === 'COLUMN') {
            const newColumnOrder = Array.from(state.columnOrder);
            newColumnOrder.splice(source.index, 1);
            newColumnOrder.splice(destination.index, 0, draggableId);

            dispatch({
                type: 'REORDER_COLUMN',
                payload: { columnOrder: newColumnOrder },
            });
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

    const openTaskView = (task: Task) => {
        navigate(`/tasks/${task.id}`);
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
            } catch {
                alert('Invalid backup file');
            }
        };
        reader.readAsText(file);
    };

    const handleAddColumn = async () => {
        if (!newColumnTitle.trim() || isSavingColumn) {
            setIsAddingColumn(false);
            return;
        }

        setIsSavingColumn(true);
        try {
            const newColumn = {
                id: uuidv4(),
                title: newColumnTitle.trim(),
                taskIds: [],
            };

            await dispatch({ type: 'ADD_COLUMN', payload: { column: newColumn } });
            setNewColumnTitle('');
            setIsAddingColumn(false);
        } finally {
            setIsSavingColumn(false);
        }
    };

    const handleDeleteColumn = (columnId: string) => {
        if (window.confirm('Are you sure you want to delete this column and all its tasks?')) {
            dispatch({ type: 'DELETE_COLUMN', payload: { columnId } });
        }
    };

    const handleUpdateColumn = (column: ColumnType) => {
        dispatch({ type: 'UPDATE_COLUMN', payload: { column } });
    };

    useEffect(() => {
        if (isAddingColumn) {
            addColumnInputRef.current?.focus();
        }
    }, [isAddingColumn]);

    return (
        <div className="p-8 h-screen max-h-screen flex flex-col overflow-hidden bg-transparent dark:bg-transparent transition-colors duration-300">
            <header className="flex flex-col gap-6 mb-8 flex-shrink-0">
                {/* Top Row: Logo and User Profile */}
                <div className="flex justify-between items-start w-full">
                    <div>
                        <button
                            onClick={() => setIsBoardPanelOpen(true)}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                                FlowForce<span className="text-accent-blue">.</span>
                            </h1>
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Streamline your workflow with precision.</p>
                    </div>

                    {user && (
                        <div className="flex items-center gap-6">
                            <NotificationBell />
                            <Link
                                to={
                                    activeBoardId
                                        ? `/boards/${activeBoardId}/wiki`
                                        : '/'
                                }
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                    location.pathname.includes('/wiki')
                                        ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20'
                                        : 'bg-white/50 dark:bg-slate-900/50 border border-white/20 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                                }`}
                            >
                                <BookOpen className="w-4 h-4" />
                                {UI_LABELS.WIKI}
                            </Link>
                            {user.role === 'ADMIN' && (
                                <Link 
                                    to="/admin/users" 
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                                        location.pathname.includes('/admin/users') 
                                            ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                                            : 'bg-white/50 dark:bg-slate-900/50 border border-white/20 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <Users className="w-4 h-4" />
                                    Team
                                </Link>
                            )}
                            
                            <div className="flex items-center gap-3 px-4 py-2 bg-white/50 dark:bg-slate-900/50 border border-white/20 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">
                                    {user.name?.[0] || user.email[0].toUpperCase()}
                                </div>
                                <div className="hidden md:block text-left">
                                    <p className="text-xs font-bold text-slate-900 dark:text-slate-200 leading-tight truncate max-w-[100px]">{user.name || user.email.split('@')[0]}</p>
                                    <button onClick={logout} className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-tighter flex items-center gap-1 transition-colors">
                                        <LogOut className="w-2.5 h-2.5" /> Log Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Row: ViewToggle, Actions, Search, and New Task */}
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-6">
                        <ViewToggle />

                        <div className="flex items-center gap-4">
                            <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-lg border border-white/20 dark:border-slate-700/50">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 rounded hover:bg-white dark:hover:bg-slate-700 transition-all text-slate-500 dark:text-slate-300"
                                    title="Toggle Theme"
                                    aria-label="Toggle dark mode"
                                >
                                    {theme === 'dark' ? (
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
                                    className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-300"
                                    title="Export Data (JSON)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 transition-all text-slate-500 dark:text-slate-300"
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
                                    className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-300"
                                    title="Undo (Ctrl+Z)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={redo}
                                    disabled={!canRedo}
                                    className="p-2 rounded hover:bg-white dark:hover:bg-slate-800 disabled:opacity-30 transition-all text-slate-500 dark:text-slate-300"
                                    title="Redo (Ctrl+Shift+Z)"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent-blue transition-colors dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={state.searchQuery}
                                onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
                                placeholder="Press / to search..."
                                aria-label="Search tasks"
                                className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 w-64 focus:w-80 outline-none focus:ring-2 focus:ring-accent-blue/30 dark:text-white transition-all duration-300"
                            />
                        </div>

                        <select
                                value={state.dueDateFilter}
                                onChange={(e) => dispatch({ type: 'SET_DUE_DATE_FILTER', payload: e.target.value as DueDateFilter })}
                                aria-label="Filter by due date"
                                className="bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 pr-8 outline-none focus:ring-2 focus:ring-accent-blue/30 dark:text-white transition-all duration-300 text-sm"
                            >
                                {DUE_DATE_FILTER_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>

                        <FilterBar />

                        <button
                            onClick={() => openCreateView()}
                            className="bg-accent-blue hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold transition-all hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            New Task
                        </button>
                    </div>
                </div>
            </header>

            {/* Sprint Filter Bar */}
            <SprintFilterBar
                boardId={activeBoardId || ''}
                onOpenSprintPanel={() => setIsSprintPanelOpen(true)}
                onOpenCreateSprint={() => setIsCreateSprintOpen(true)}
            />

            <AnimatePresence mode="wait">
                {!isHydrated ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center"
                    >
                        <div className="w-16 h-16 border-4 border-accent-blue/20 border-t-accent-blue rounded-full animate-spin mb-4" />
                        <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">Loading Board...</p>
                    </motion.div>
                ) : state.viewMode === 'board' ? (
                    <motion.div
                        key="board"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 min-h-0"
                    >
                        <DragDropContext onDragEnd={onDragEnd}>
                            <Droppable droppableId="all-columns" direction="horizontal" type="COLUMN">
                                {(provided) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={(el) => {
                                            provided.innerRef(el);
                                            (scrollContainerRef as any).current = el;
                                        }}
                                        onMouseDown={handleMouseDown}
                                        onMouseLeave={handleMouseLeave}
                                        onMouseUp={handleMouseUp}
                                        onMouseMove={handleMouseMove}
                                        style={{ minWidth: '100%', display: 'flex' }}
                                        className={`h-full overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 select-none gap-6 items-start ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} relative board-glow`}
                                    >
                                        {state.columnOrder.map((columnId, index) => {
                                            const column = state.columns[columnId];
                                            const tasks = visibleTasksByColumn[columnId] || [];

                                            return (
                                                <Column
                                                    key={column.id}
                                                    index={index}
                                                    column={column}
                                                    tasks={tasks}
                                                    focusedTaskId={focusedCard?.columnId === column.id ? focusedCard.taskId : null}
                                                    onAddTask={() => openCreateView(column.id)}
                                                    onEditTask={openTaskView}
                                                    onDeleteTask={(taskId) => handleDeleteTask(taskId, column.id)}
                                                    onDeleteColumn={() => handleDeleteColumn(column.id)}
                                                    onUpdateColumn={handleUpdateColumn}
                                                    selectedTaskIds={state.selectedTaskIds}
                                                    onSelectTask={handleSelectTask}
                                                />
                                            );
                                        })}
                                        {provided.placeholder}

                                        {/* Add Column Button */}
                                        <div className="w-80 flex-shrink-0 pr-8">
                                            {isAddingColumn ? (
                                                <div className="glass rounded-3xl p-4 border-2 border-accent-blue/30 bg-white/5">
                                                    <input
                                                        ref={addColumnInputRef}
                                                        type="text"
                                                        disabled={isSavingColumn}
                                                        value={newColumnTitle}
                                                        onChange={(e) => setNewColumnTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                                                        placeholder="Enter column title..."
                                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white outline-none focus:ring-2 focus:ring-accent-blue/50 mb-3 disabled:opacity-50"
                                                    />
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleAddColumn}
                                                            disabled={isSavingColumn}
                                                            className="flex-1 bg-accent-blue hover:bg-blue-600 text-white py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isSavingColumn ? (
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Check className="w-4 h-4" /> Add
                                                                </>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => !isSavingColumn && setIsAddingColumn(false)}
                                                            disabled={isSavingColumn}
                                                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all disabled:opacity-50"
                                                        >
                                                            <X className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setIsAddingColumn(true)}
                                                    className="w-full group glass border-2 border-dashed border-slate-300 dark:border-slate-800 hover:border-accent-blue/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 opacity-60 hover:opacity-100 bg-white/5"
                                                >
                                                    <div className="p-3 bg-slate-200 dark:bg-slate-800 group-hover:bg-accent-blue group-hover:text-white rounded-2xl transition-all">
                                                        <Plus className="w-6 h-6" />
                                                    </div>
                                                    <span className="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs">Add Column</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 min-h-0"
                    >
                        <ListView onTaskClick={openTaskView} />
                    </motion.div>
                )}
            </AnimatePresence>

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
                            <Trash2 className="w-5 h-5" />
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

            {/* Task Drawer */}
            <Drawer isOpen={isDrawerOpen} onClose={() => navigate('/')}>
                <Outlet />
            </Drawer>

            {/* Sprint Panel */}
            <SprintPanel
                isOpen={isSprintPanelOpen}
                onClose={() => setIsSprintPanelOpen(false)}
                boardId={activeBoardId || ''}
            />

            {/* Board Panel for multi-board support */}
            <BoardPanel
                isOpen={isBoardPanelOpen}
                onClose={() => setIsBoardPanelOpen(false)}
                activeBoardId={activeBoardId}
                allBoards={allBoards}
                onSwitchBoard={setActiveBoard}
                onBoardCreated={addBoard}
                onBoardDeleted={deleteBoard}
                onBoardRenamed={renameBoard}
                onError={showToast}
            />

            {/* Create Sprint Modal (triggered from SprintFilterBar) */}
            <CreateSprintModal
                isOpen={isCreateSprintOpen}
                onClose={() => setIsCreateSprintOpen(false)}
                onCreated={(_sprint) => {}}
                boardId={activeBoardId || ''}
            />
        </div>
    );
};

export default Board;
