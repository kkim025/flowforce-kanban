export type Priority = 'low' | 'medium' | 'high';
export type ViewMode = 'board' | 'list';
export type UserRole = 'ADMIN' | 'MEMBER';
export type UserStatus = 'ACTIVE' | 'PENDING' | 'INACTIVE';
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type DueDateFilter = 'all' | 'overdue' | 'dueToday' | 'dueThisWeek' | 'noDate';
export type AssigneeFilter = string | null;
export type PriorityFilter = Priority | null;
export type TagFilter = string[];

export interface Sprint {
    id: string;
    boardId: string;
    name: string;
    startDate: string;
    endDate: string;
    status: SprintStatus;
    color?: string;
}

export interface User {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
    role: UserRole;
    status: UserStatus;
}

export interface SubTask {
    id: string;
    title: string;
    isCompleted: boolean;
    checklistId?: string;
    order?: number;        // for sorting within checklist
    priority?: Priority;   // undefined/null means inherit from parent task
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
    sprintId?: string;
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
    sprints: Sprint[];
    activeSprintId: string | null;
    dueDateFilter: DueDateFilter;
    assigneeFilter: AssigneeFilter;
    priorityFilter: PriorityFilter;
    tagFilter: TagFilter;
    assignees: User[];
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
    | { type: 'ADD_SUBTASK'; payload: { taskId: string; checklistId: string; subtask: SubTask } }
    | { type: 'UPDATE_SUBTASK'; payload: { taskId: string; subtask: SubTask } }
    | { type: 'DELETE_SUBTASK'; payload: { taskId: string; checklistId: string; subtaskId: string } }
    | { type: 'REORDER_SUBTASKS'; payload: { taskId: string; checklistId: string; orderedSubtasks: SubTask[] } }
    | { type: 'TOGGLE_SUBTASK'; payload: { taskId?: string; subtaskId: string } }
    | { type: 'ADD_COMMENT'; payload: { taskId: string; comment: Comment } }
    | { type: 'UPDATE_COMMENT'; payload: { taskId: string; comment: Comment } }
    | { type: 'DELETE_COMMENT'; payload: { taskId: string; commentId: string; userId: string } }
    | { type: 'UNDO' }
    | { type: 'REDO' }
    | { type: 'INTERNAL_UNDO' }
    | { type: 'INTERNAL_REDO' }
    | { type: 'SET_SPRINTS'; payload: { sprints: Sprint[] } }
    | { type: 'ADD_SPRINT'; payload: { sprint: Sprint } }
    | { type: 'UPDATE_SPRINT'; payload: { sprint: Sprint } }
    | { type: 'DELETE_SPRINT'; payload: { sprintId: string } }
    | { type: 'SET_ACTIVE_SPRINT'; payload: { sprintId: string | null } }
    | { type: 'SET_DUE_DATE_FILTER'; payload: DueDateFilter }
    | { type: 'UPDATE_TASK_DUE_DATE'; payload: { taskId: string; dueDate: string | null } }
    | { type: 'ASSIGN_TASK_TO_SPRINT'; payload: { taskId: string; sprintId: string | null } }
    | { type: 'SET_ASSIGNEE_FILTER'; payload: AssigneeFilter }
    | { type: 'SET_PRIORITY_FILTER'; payload: PriorityFilter }
    | { type: 'SET_TAG_FILTER'; payload: TagFilter }
    | { type: 'SET_ASSIGNEES'; payload: { assignees: User[] } }
    | { type: 'CLEAR_ALL_FILTERS' };
