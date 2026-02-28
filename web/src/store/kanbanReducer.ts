import { BoardState, KanbanAction } from '../types';

export const initialState: BoardState = {
    tasks: {},
    columns: {
        'backlog': { id: 'backlog', title: 'Backlog', taskIds: [] },
        'todo': { id: 'todo', title: 'To Do', taskIds: [], wipLimit: 10 },
        'inprogress': { id: 'inprogress', title: 'In Progress', taskIds: [], wipLimit: 3 },
        'review': { id: 'review', title: 'Review', taskIds: [], wipLimit: 2 },
        'done': { id: 'done', title: 'Done', taskIds: [] },
    },
    columnOrder: ['backlog', 'todo', 'inprogress', 'review', 'done'],
    selectedTaskIds: [],
};

export interface HistoryState {
    past: BoardState[];
    present: BoardState;
    future: BoardState[];
}

export const kanbanReducer = (state: BoardState, action: KanbanAction): BoardState => {
    switch (action.type) {
        case 'MOVE_TASK': {
            const { taskId, sourceColId, destinationColId, sourceIndex, destinationIndex } = action.payload;

            if (sourceColId === destinationColId) {
                const column = state.columns[sourceColId];
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
            return {
                ...state,
                tasks: { ...state.tasks, [task.id]: task },
                columns: {
                    ...state.columns,
                    [columnId]: {
                        ...state.columns[columnId],
                        taskIds: [...state.columns[columnId].taskIds, task.id],
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

            return {
                ...state,
                tasks: newTasks,
                columns: {
                    ...state.columns,
                    [columnId]: {
                        ...state.columns[columnId],
                        taskIds: state.columns[columnId].taskIds.filter(id => id !== taskId),
                    },
                },
            };
        }

        case 'SET_STATE':
            return { ...action.payload, selectedTaskIds: [] };

        case 'TOGGLE_SELECT_TASK': {
            const { taskId, multiSelect } = (action as any).payload;
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

        default:
            return state;
    }
};
