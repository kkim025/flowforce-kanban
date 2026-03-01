import { BoardState, KanbanAction } from '../types';

export const initialState: BoardState = {
    tasks: {},
    columns: {},
    columnOrder: [],
    selectedTaskIds: [],
    viewMode: (localStorage.getItem('flowforce_view_mode') as 'board' | 'list') || 'board',
    searchQuery: '',
};

export interface HistoryState {
    past: BoardState[];
    present: BoardState;
    future: BoardState[];
}

export const kanbanReducer = (state: BoardState, action: KanbanAction): BoardState => {
    switch (action.type) {
        case 'SET_SEARCH_QUERY':
            return { ...state, searchQuery: action.payload };

        case 'MOVE_TASK': {
            const { taskId, sourceColId, destinationColId, sourceIndex, destinationIndex } = action.payload;

            if (sourceColId === destinationColId) {
                const column = state.columns[sourceColId];
                if (!column) return state;
                const newTaskIds = Array.from(column.taskIds);
                newTaskIds.splice(sourceIndex, 1);
                newTaskIds.splice(destinationIndex, 0, taskId);

                return {
                    ...state,
                    columns: {
                        ...state.columns,
                        [sourceColId]: { ...column, taskIds: newTaskIds },
                    },
                };
            }

            const start = state.columns[sourceColId];
            const finish = state.columns[destinationColId];
            if (!start || !finish) return state;
            const startTaskIds = Array.from(start.taskIds);
            startTaskIds.splice(sourceIndex, 1);
            const finishTaskIds = Array.from(finish.taskIds);
            finishTaskIds.splice(destinationIndex, 0, taskId);

            return {
                ...state,
                columns: {
                    ...state.columns,
                    [sourceColId]: { ...start, taskIds: startTaskIds },
                    [destinationColId]: { ...finish, taskIds: finishTaskIds },
                },
            };
        }

        case 'ADD_TASK': {
            const { columnId, task } = action.payload;
            const column = state.columns[columnId];
            if (!column) return state;
            return {
                ...state,
                tasks: { ...state.tasks, [task.id]: task },
                columns: {
                    ...state.columns,
                    [columnId]: {
                        ...column,
                        taskIds: [...column.taskIds, task.id],
                    },
                },
            };
        }

        case 'UPDATE_TASK': {
            const { task } = action.payload;
            return {
                ...state,
                tasks: { ...state.tasks, [task.id]: task },
            };
        }

        case 'DELETE_TASK': {
            const { taskId, columnId } = action.payload;
            const newTasks = { ...state.tasks };
            delete newTasks[taskId];

            const column = state.columns[columnId];
            if (!column) return { ...state, tasks: newTasks };

            return {
                ...state,
                tasks: newTasks,
                columns: {
                    ...state.columns,
                    [columnId]: {
                        ...column,
                        taskIds: column.taskIds.filter(id => id !== taskId),
                    },
                },
            };
        }

        case 'ADD_COLUMN': {
            const { column } = action.payload;
            return {
                ...state,
                columns: {
                    ...state.columns,
                    [column.id]: column,
                },
                columnOrder: [...state.columnOrder, column.id],
            };
        }

        case 'DELETE_COLUMN': {
            const { columnId } = action.payload;
            const newColumns = { ...state.columns };
            const taskIdsToRemove = newColumns[columnId]?.taskIds || [];
            delete newColumns[columnId];

            const newTasks = { ...state.tasks };
            taskIdsToRemove.forEach(id => delete newTasks[id]);

            return {
                ...state,
                tasks: newTasks,
                columns: newColumns,
                columnOrder: state.columnOrder.filter(id => id !== columnId),
            };
        }

        case 'REORDER_COLUMN': {
            const { columnOrder } = action.payload;
            return {
                ...state,
                columnOrder,
            };
        }

        case 'UPDATE_COLUMN': {
            const { column } = action.payload;
            return {
                ...state,
                columns: {
                    ...state.columns,
                    [column.id]: column,
                },
            };
        }

        case 'SET_STATE':
            return { 
                ...initialState,
                ...action.payload, 
                selectedTaskIds: [],
                searchQuery: action.payload.searchQuery !== undefined ? action.payload.searchQuery : state.searchQuery,
                viewMode: action.payload.viewMode !== undefined ? action.payload.viewMode : state.viewMode
            };

        case 'TOGGLE_SELECT_TASK': {
            const { taskId, multiSelect } = action.payload;
            if (!multiSelect) {
                return { ...state, selectedTaskIds: [taskId] };
            }
            const isSelected = state.selectedTaskIds.includes(taskId);
            return {
                ...state,
                selectedTaskIds: isSelected
                    ? state.selectedTaskIds.filter(id => id !== taskId)
                    : [...state.selectedTaskIds, taskId],
            };
        }

        case 'CLEAR_SELECTION':
            return { ...state, selectedTaskIds: [] };

        case 'SET_VIEW_MODE':
            return { ...state, viewMode: action.payload };

        case 'ADD_CHECKLIST': {
            const { taskId, checklist } = action.payload;
            const task = state.tasks[taskId];
            if (!task) return state;
            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...task,
                        checklists: [...(task.checklists || []), checklist],
                    },
                },
            };
        }

        case 'DELETE_CHECKLIST': {
            const { taskId, checklistId } = action.payload;
            const task = state.tasks[taskId];
            if (!task) return state;
            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...task,
                        checklists: (task.checklists || []).filter(cl => cl.id !== checklistId),
                    },
                },
            };
        }

        case 'UPDATE_CHECKLIST': {
            const { taskId, checklist } = action.payload;
            const task = state.tasks[taskId];
            if (!task) return state;
            return {
                ...state,
                tasks: {
                    ...state.tasks,
                    [taskId]: {
                        ...task,
                        checklists: (task.checklists || []).map(cl => cl.id === checklist.id ? checklist : cl),
                    },
                },
            };
        }

        default:
            return state;
    }
};
