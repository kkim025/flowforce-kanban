export const UI_LABELS = {
    CANCEL: 'Cancel',
    SAVE: 'Save',
    COMMENT: 'Comment',
    EDIT: 'Edit',
    DELETE: 'Delete',
    CONFIRM: 'Confirm',
    CLOSE: 'Close',
    TASK_NOT_FOUND: 'Task not found',
    BACK_TO_BOARD: 'Back to board',
    NO_DESCRIPTION: 'No description provided.',
    DESCRIPTION: 'Description',
    ACTIVITY: 'Activity',
    CHECKLISTS: 'Checklists',
    ADD_ITEM: 'Add an item',
    ADD_CHECKLIST: 'Add Checklist',
    LABELS: 'Labels',
    PRIORITY: 'Priority',
    ASSIGNEE: 'Assignee',
    UNASSIGNED: 'Unassigned',
    CLEAR_ASSIGNEE: 'Clear assignee',
    ADD_TAG: 'Add a tag...',
    SAVE_TASK: 'Save Task',
    CREATE_TASK: 'Create New Task',
    EDIT_TASK: 'Edit Task',
    TASK_TITLE: 'Task Title',
    ADD_DETAILS: 'Add more details... (Markdown supported)',
    NOTHING_TO_PREVIEW: 'Nothing to preview',
    UNSAVED_CHANGES: 'You have unsaved changes. Discard them?',
    SPRINT: 'Sprint',
    ALL_TASKS: 'All Tasks',
    MANAGE_SPRINTS: 'Manage Sprints',
    CREATE_SPRINT: 'Create Sprint',
    EDIT_SPRINT: 'Edit Sprint',
    NO_SPRINT: 'No Sprint',
    SPRINT_NAME: 'Sprint Name',
    START_DATE: 'Start Date',
    END_DATE: 'End Date',
    ACTIVATE: 'Activate',
    COMPLETE: 'Complete',
    VIEW: 'View',
    NO_SPRINTS_YET: 'No sprints yet. Create one to get started.',
    SPRINT_COMPLETED: 'Sprint completed. Viewing all tasks.',
    SPRINT_DELETED: 'Sprint deleted. Viewing all tasks.',
    DAYS_LEFT: 'days left',
    SPRINT_OVERDUE: 'Sprint overdue',
    DUE_DATE: 'Due Date',
};

export const DUE_DATE_FILTER_OPTIONS = [
    { value: 'all', label: 'All Dates' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'dueToday', label: 'Due Today' },
    { value: 'dueThisWeek', label: 'Due This Week' },
    { value: 'noDate', label: 'No Date' },
] as const;

export const DEFAULT_CUSTOM_COLOR = '#3B82F6';

export const SPRINT_COLORS = [
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#F43F5E', // Rose
    '#EC4899', // Pink
    '#6366F1', // Indigo
];
