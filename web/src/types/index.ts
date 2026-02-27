export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
    id: string;
    title: string;
    isCompleted: boolean;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    tags: string[];
    dueDate?: string;
    subTasks: SubTask[];
    createdAt: string;
}

export interface Column {
    id: string;
    title: string;
    taskIds: string[];
    wipLimit?: number;
}

export interface BoardState {
    tasks: Record<string, Task>;
    columns: Record<string, Column>;
    columnOrder: string[];
    selectedTaskIds: string[];
}

export type KanbanAction =
    | { type: 'MOVE_TASK'; payload: { taskId: string; sourceColId: string; destinationColId: string; sourceIndex: number; destinationIndex: number } }
    | { type: 'ADD_TASK'; payload: { columnId: string; task: Task } }
    | { type: 'UPDATE_TASK'; payload: { task: Task } }
    | { type: 'DELETE_TASK'; payload: { taskId: string; columnId: string } }
    | { type: 'REORDER_COLUMN'; payload: { columnOrder: string[] } }
    | { type: 'UPDATE_COLUMN'; payload: { column: Column } }
    | { type: 'SET_STATE'; payload: BoardState }
    | { type: 'TOGGLE_SELECT_TASK'; payload: { taskId: string; multiSelect: boolean } }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'INTERNAL_UNDO' }
    | { type: 'INTERNAL_REDO' };
