export type Priority = 'low' | 'medium' | 'high';
export type ViewMode = 'board' | 'list';

export interface SubTask {
    id: string;
    title: string;
    isCompleted: boolean;
    checklistId?: string;
}

export interface Checklist {
    id: string;
    title: string;
    taskId: string;
    items: SubTask[];
}

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    tags: string[];
    dueDate?: string;
    subTasks: SubTask[]; // Keeping for backward compatibility or simple lists
    checklists: Checklist[];
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
    viewMode: ViewMode;
    searchQuery: string;
}

export type KanbanAction =
    | { type: 'MOVE_TASK'; payload: { taskId: string; sourceColId: string; destinationColId: string; sourceIndex: number; destinationIndex: number } }
    | { type: 'ADD_TASK'; payload: { columnId: string; task: Task } }
    | { type: 'UPDATE_TASK'; payload: { task: Task } }
    | { type: 'DELETE_TASK'; payload: { taskId: string; columnId: string } }
    | { type: 'REORDER_COLUMN'; payload: { columnOrder: string[] } }
    | { type: 'UPDATE_COLUMN'; payload: { column: Column } }
    | { type: 'ADD_COLUMN'; payload: { column: Column } }
    | { type: 'DELETE_COLUMN'; payload: { columnId: string } }
    | { type: 'SET_STATE'; payload: BoardState }
    | { type: 'TOGGLE_SELECT_TASK'; payload: { taskId: string; multiSelect: boolean } }
    | { type: 'CLEAR_SELECTION' }
    | { type: 'SET_VIEW_MODE'; payload: ViewMode }
    | { type: 'SET_SEARCH_QUERY'; payload: string }
    | { type: 'ADD_CHECKLIST'; payload: { taskId: string; checklist: Checklist } }
    | { type: 'DELETE_CHECKLIST'; payload: { taskId: string; checklistId: string } }
    | { type: 'UPDATE_CHECKLIST'; payload: { taskId: string; checklist: Checklist } }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'INTERNAL_UNDO' }
    | { type: 'INTERNAL_REDO' };
