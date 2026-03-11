export type Priority = 'low' | 'medium' | 'high';
export type ViewMode = 'board' | 'list';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

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

export interface Comment {
    id: string;
    taskId: string;
    userId: string;
    content: string;
    createdAt: string;
}

export type ActivityBase = {
    id: string;
    taskId: string;
    userId: string;
    createdAt: string;
};

export type Activity = 
    | (ActivityBase & { type: 'comment'; details: { text: string; commentId: string } })
    | (ActivityBase & { type: 'status_change'; details: { from: string; to: string } })
    | (ActivityBase & { type: 'priority_change'; details: { from: Priority; to: Priority } })
    | (ActivityBase & { type: 'assignee_change'; details: { from?: string; to?: string } })
    | (ActivityBase & { type: 'tag_change'; details: { text: string } })
    | (ActivityBase & { type: 'task_created'; details?: never })
    | (ActivityBase & { type: 'checklist_added'; details: { title: string } });

export interface Task {
    id: string;
    title: string;
    description: string;
    priority: Priority;
    tags: string[];
    assigneeId?: string;
    dueDate?: string;
    subTasks: SubTask[];
    checklists: Checklist[];
    comments: Comment[];
    activities: Activity[];
    createdAt: string;
    isArchived?: boolean;
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
    | { type: 'ADD_COMMENT'; payload: { taskId: string; comment: Comment } }
    | { type: 'UPDATE_COMMENT'; payload: { taskId: string; comment: Comment } }
    | { type: 'DELETE_COMMENT'; payload: { taskId: string; commentId: string; userId: string } }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'INTERNAL_UNDO' }
    | { type: 'INTERNAL_REDO' };
