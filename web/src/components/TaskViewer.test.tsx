import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TaskViewer from './TaskViewer';
import React from 'react';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';

// Mock context hooks
vi.mock('../store/KanbanContext', () => ({
    useKanban: vi.fn()
}));

vi.mock('../store/UserContext', () => ({
    useUsers: vi.fn()
}));

vi.mock('../store/AuthContext', () => ({
    useAuth: vi.fn()
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock MarkdownEditor
vi.mock('./MarkdownEditor', () => ({
    default: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <textarea data-testid="markdown-editor" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )
}));

// Mock window.confirm
window.confirm = vi.fn();

const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium' as const,
    assigneeId: 'user-1',
    tags: ['bug'],
    subTasks: [],
    checklists: [],
    comments: [
        {
            id: 'comment-1',
            taskId: 'task-1',
            userId: 'user-1',
            content: 'Existing comment',
            createdAt: new Date().toISOString()
        }
    ],
    activities: [
        {
            id: 'activity-1',
            taskId: 'task-1',
            userId: 'user-1',
            type: 'task_created' as const,
            details: undefined,
            createdAt: new Date().toISOString()
        }
    ],
    createdAt: new Date().toISOString()
};

const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
    { id: 'user-2', name: 'User Two', email: 'user2@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const }
];

describe('TaskViewer', () => {
    const dispatch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useKanban).mockReturnValue({
            state: {
                tasks: { 'task-1': mockTask },
                columns: {
                    'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] },
                    'col-2': { id: 'col-2', title: 'Done', taskIds: [] }
                },
                columnOrder: ['col-1', 'col-2'],
                selectedTaskIds: [],
                viewMode: 'board' as const,
                searchQuery: '',
                sprints: [],
                activeSprintId: null,
                dueDateFilter: 'all' as const,
                assigneeFilter: null,
                priorityFilter: null,
                tagFilter: [] as string[],
                assignees: []
            },
            dispatch,
            undo: () => {},
            redo: () => {},
            canUndo: false,
            canRedo: false,
            isSyncing: false,
            isHydrated: true,
            activeBoardId: null,
            allBoards: [],
            setActiveBoard: vi.fn(),
            updateTaskDueDate: vi.fn()
        });
        vi.mocked(useUsers).mockReturnValue({
            users: mockUsers,
            getInitials: (id: string | null | undefined) => id ? mockUsers.find(u => u.id === id)?.name?.[0] || '?' : '?',
            getUserName: (id: string | null | undefined) => id ? mockUsers.find(u => u.id === id)?.name || 'Unknown' : 'Unknown',
            userMap: new Map(mockUsers.map(u => [u.id, u])),
            isLoading: false,
            error: null,
            refreshUsers: vi.fn()
        });
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1', name: 'User One', email: 'user1@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const }, token: 'test-token', loading: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), isAuthenticated: true });
    });

    it('should show "Task not found" when taskId is invalid', () => {
        vi.mocked(useKanban).mockReturnValue({
            state: { tasks: {}, columns: {}, columnOrder: [], selectedTaskIds: [], viewMode: 'board' as const, searchQuery: '', sprints: [], activeSprintId: null, dueDateFilter: 'all' as const,
                assigneeFilter: null,
                priorityFilter: null,
                tagFilter: [] as string[],
                assignees: [] },
            dispatch: vi.fn(),
            undo: () => {},
            redo: () => {},
            canUndo: false,
            canRedo: false,
            isSyncing: false,
            isHydrated: true,
            activeBoardId: null,
            allBoards: [],
            setActiveBoard: vi.fn(),
            updateTaskDueDate: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/tasks/invalid-id']}>
                <Routes>
                    <Route path="/tasks/:taskId" element={<TaskViewer />} />
                </Routes>
            </MemoryRouter>
        );
        
        expect(screen.getByText('Task not found')).toBeInTheDocument();
    });

    it('should render task details when task exists', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/task-1']}>
                <Routes>
                    <Route path="/tasks/:taskId" element={<TaskViewer />} />
                </Routes>
            </MemoryRouter>
        );
        
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByText('Existing comment')).toBeInTheDocument();
    });

    describe('Comment Management', () => {
        it('should allow adding a new comment', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            const input = screen.getByPlaceholderText('Add a comment...');
            fireEvent.change(input, { target: { value: 'New comment' } });
            
            const button = screen.getByText('Comment');
            fireEvent.click(button);

            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'ADD_COMMENT',
                payload: expect.objectContaining({
                    taskId: 'task-1',
                    comment: expect.objectContaining({
                        content: 'New comment'
                    })
                })
            }));
        });

        it('should allow editing a comment', async () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Find the comment and click edit
            const editButton = screen.getByTitle('Edit comment');
            fireEvent.click(editButton);

            // Change text
            const textarea = screen.getByDisplayValue('Existing comment');
            fireEvent.change(textarea, { target: { value: 'Updated comment content' } });

            // Save
            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'UPDATE_COMMENT',
                payload: expect.objectContaining({
                    taskId: 'task-1',
                    comment: expect.objectContaining({
                        content: 'Updated comment content'
                    })
                })
            }));
        });

        it('should cancel edit without changes smoothly', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            fireEvent.click(screen.getByTitle('Edit comment'));
            expect(screen.getByDisplayValue('Existing comment')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Cancel'));
            expect(screen.queryByDisplayValue('Existing comment')).not.toBeInTheDocument();
            expect(screen.getByText('Existing comment')).toBeInTheDocument();
        });

        it('should prompt before canceling edit with unsaved changes', () => {
            vi.mocked(window.confirm).mockReturnValue(true);
            
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            fireEvent.click(screen.getByTitle('Edit comment'));
            const textarea = screen.getByDisplayValue('Existing comment');
            fireEvent.change(textarea, { target: { value: 'Modified content' } });

            fireEvent.click(screen.getByText('Cancel'));
            
            expect(window.confirm).toHaveBeenCalledWith('You have unsaved changes. Discard them?');
            expect(screen.getByText('Existing comment')).toBeInTheDocument();
        });

        it('should allow deleting a comment', async () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click delete button
            const deleteButton = screen.getByTitle('Delete comment');
            fireEvent.click(deleteButton);

            // Verify confirmation modal is shown
            expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();

            // Confirm deletion
            const confirmButtons = screen.getAllByText('Delete Comment');
            const confirmButton = confirmButtons.find(btn => btn.tagName === 'BUTTON');
            if (confirmButton) fireEvent.click(confirmButton);

            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'DELETE_COMMENT',
                payload: expect.objectContaining({
                    taskId: 'task-1',
                    commentId: 'comment-1'
                })
            }));
        });

        it('should not show edit/delete buttons for comments from other users', () => {
            const taskWithOtherComment = {
                ...mockTask,
                comments: [
                    {
                        id: 'comment-other',
                        taskId: 'task-1',
                        userId: 'user-2',
                        content: 'Other user comment',
                        createdAt: new Date().toISOString()
                    }
                ]
            };

            vi.mocked(useKanban).mockReturnValue({
                state: {
                    tasks: { 'task-1': taskWithOtherComment },
                    columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } },
                    columnOrder: ['col-1'],
                    selectedTaskIds: [],
                    viewMode: 'board' as const,
                    searchQuery: '',
                    sprints: [],
                    activeSprintId: null,
                    dueDateFilter: 'all' as const,
                assigneeFilter: null,
                priorityFilter: null,
                tagFilter: [] as string[],
                assignees: []
                },
                dispatch,
                undo: () => {},
                redo: () => {},
                canUndo: false,
                canRedo: false,
                isSyncing: false,
                isHydrated: true,
                activeBoardId: null,
            allBoards: [],
            setActiveBoard: vi.fn(),
                updateTaskDueDate: vi.fn()
            });

            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            expect(screen.getByText('Other user comment')).toBeInTheDocument();
            expect(screen.queryByTitle('Edit comment')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument();
        });
    });

    it('should render mixed timeline items correctly', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/task-1']}>
                <Routes>
                    <Route path="/tasks/:taskId" element={<TaskViewer />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('created this task')).toBeInTheDocument();
        expect(screen.getByText('Existing comment')).toBeInTheDocument();
    });

    it('should handle markdown in comments', () => {
        const taskWithMarkdown = {
            ...mockTask,
            comments: [
                {
                    id: 'comment-md',
                    taskId: 'task-1',
                    userId: 'user-1',
                    content: '**Bold Text** and [Link](https://example.com)',
                    createdAt: new Date().toISOString()
                }
            ]
        };

        vi.mocked(useKanban).mockReturnValue({
            state: {
                tasks: { 'task-1': taskWithMarkdown },
                columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } },
                columnOrder: ['col-1'],
                selectedTaskIds: [],
                viewMode: 'board' as const,
                searchQuery: '',
                sprints: [],
                activeSprintId: null,
                dueDateFilter: 'all' as const,
                assigneeFilter: null,
                priorityFilter: null,
                tagFilter: [] as string[],
                assignees: []
            },
            dispatch,
            undo: () => {},
            redo: () => {},
            canUndo: false,
            canRedo: false,
            isSyncing: false,
            isHydrated: true,
            activeBoardId: null,
            allBoards: [],
            setActiveBoard: vi.fn(),
            updateTaskDueDate: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/tasks/task-1']}>
                <Routes>
                    <Route path="/tasks/:taskId" element={<TaskViewer />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Bold Text').tagName).toBe('STRONG');
        expect(screen.getByRole('link', { name: 'Link' })).toHaveAttribute('href', 'https://example.com');
    });

    describe('Description Inline Editing', () => {
        it('should enter edit mode when clicking description', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click on the description area
            const descriptionArea = screen.getByText('Test Description').closest('.prose');
            if (descriptionArea) fireEvent.click(descriptionArea);
            else fireEvent.click(screen.getByText('Test Description'));

            // Should show Save and Cancel buttons
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should save description and dispatch UPDATE_TASK', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click to enter edit mode
            const descriptionArea = screen.getByText('Test Description').closest('.prose');
            if (descriptionArea) fireEvent.click(descriptionArea);
            else fireEvent.click(screen.getByText('Test Description'));

            // Click Save
            fireEvent.click(screen.getByText('Save'));

            // Should dispatch UPDATE_TASK with new description
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'UPDATE_TASK',
                payload: expect.objectContaining({
                    task: expect.objectContaining({
                        id: 'task-1',
                        description: 'Test Description'
                    })
                })
            }));
        });

        it('should cancel edit and return to read mode', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click to enter edit mode
            const descriptionArea = screen.getByText('Test Description').closest('.prose');
            if (descriptionArea) fireEvent.click(descriptionArea);
            else fireEvent.click(screen.getByText('Test Description'));

            // Click Cancel
            fireEvent.click(screen.getByText('Cancel'));

            // Should be back in read mode - no Save/Cancel buttons
            expect(screen.queryByText('Save')).not.toBeInTheDocument();
            expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
            // Description should still be shown
            expect(screen.getByText('Test Description')).toBeInTheDocument();
        });

        it('should enter edit mode when clicking "No description" placeholder', () => {
            const taskWithoutDescription = {
                ...mockTask,
                description: ''
            };

            vi.mocked(useKanban).mockReturnValue({
                state: {
                    tasks: { 'task-1': taskWithoutDescription },
                    columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } },
                    columnOrder: ['col-1'],
                    selectedTaskIds: [],
                    viewMode: 'board' as const,
                    searchQuery: '',
                    sprints: [],
                    activeSprintId: null,
                    dueDateFilter: 'all' as const,
                assigneeFilter: null,
                priorityFilter: null,
                tagFilter: [] as string[],
                assignees: []
                },
                dispatch,
                undo: () => {},
                redo: () => {},
                canUndo: false,
                canRedo: false,
                isSyncing: false,
                isHydrated: true,
                activeBoardId: null,
            allBoards: [],
            setActiveBoard: vi.fn(),
                updateTaskDueDate: vi.fn()
            });

            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click on the "No description" placeholder
            fireEvent.click(screen.getByText('No description provided.'));

            // Should show Save and Cancel buttons
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });
    });

    describe('Title Inline Editing', () => {
        it('should enter edit mode when clicking title', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click on the title
            fireEvent.click(screen.getByText('Test Task'));

            // Should show Save and Cancel buttons
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('should save title and dispatch UPDATE_TASK', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click to enter edit mode
            fireEvent.click(screen.getByText('Test Task'));

            // Change the title - use first textbox (the title input)
            const inputs = screen.getAllByRole('textbox');
            fireEvent.change(inputs[0], { target: { value: 'Updated Task Title' } });

            // Click Save
            fireEvent.click(screen.getByText('Save'));

            // Should dispatch UPDATE_TASK with new title
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'UPDATE_TASK',
                payload: expect.objectContaining({
                    task: expect.objectContaining({
                        id: 'task-1',
                        title: 'Updated Task Title'
                    })
                })
            }));
        });

        it('should cancel edit and return to read mode', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click to enter edit mode
            fireEvent.click(screen.getByText('Test Task'));

            // Click Cancel
            fireEvent.click(screen.getByText('Cancel'));

            // Should be back in read mode
            expect(screen.queryByText('Save')).not.toBeInTheDocument();
            expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
            // Original title should still be shown
            expect(screen.getByText('Test Task')).toBeInTheDocument();
        });

        it('should not save empty title', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click to enter edit mode
            fireEvent.click(screen.getByText('Test Task'));

            // Clear the title - use first textbox (the title input)
            const inputs = screen.getAllByRole('textbox');
            fireEvent.change(inputs[0], { target: { value: '' } });

            // Save button should be disabled
            const saveButton = screen.getByText('Save');
            expect(saveButton).toBeDisabled();
        });

        it('should enter title edit mode on title click', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Initially, title is displayed as text, not as input
            expect(screen.getByText('Test Task')).toBeInTheDocument();

            // Click on the title
            fireEvent.click(screen.getByText('Test Task'));

            // After clicking, the title becomes editable (shows textbox with the title value)
            const textboxes = screen.getAllByRole('textbox');
            const titleInput = textboxes.find(input => input.tagName === 'INPUT' || (input as HTMLInputElement).type === 'text');
            expect(titleInput).toBeInTheDocument();
        });
    });

    describe('Status Dropdown', () => {
        it('should show status dropdown when clicking status badge', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click the status badge - use first occurrence (the badge itself)
            fireEvent.click(screen.getAllByText('Todo')[0]);

            // Should show 'Done' option in dropdown
            expect(screen.getByText('Done')).toBeInTheDocument();
        });

        it('should dispatch MOVE_TASK when selecting different column', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click the status badge - use first occurrence (the badge itself)
            fireEvent.click(screen.getAllByText('Todo')[0]);

            // Should show 'Done' option in dropdown
            expect(screen.getByText('Done')).toBeInTheDocument();
        });

        it('should dispatch MOVE_TASK when selecting different column', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click the status badge to open dropdown
            fireEvent.click(screen.getAllByText('Todo')[0]);

            // Select 'Done' column
            fireEvent.click(screen.getByText('Done'));

            // Should dispatch MOVE_TASK
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'MOVE_TASK',
                payload: expect.objectContaining({
                    taskId: 'task-1',
                    destinationColId: 'col-2'
                })
            }));
        });

        it('should close dropdown when selecting a column', () => {
            render(
                <MemoryRouter initialEntries={['/tasks/task-1']}>
                    <Routes>
                        <Route path="/tasks/:taskId" element={<TaskViewer />} />
                    </Routes>
                </MemoryRouter>
            );

            // Click the status badge to open dropdown
            fireEvent.click(screen.getAllByText('Todo')[0]);

            // Dropdown is open - 'Done' should be visible in dropdown
            expect(screen.getByText('Done')).toBeInTheDocument();

            // Select 'Done' - this should close the dropdown
            fireEvent.click(screen.getByText('Done'));

            // After selection, dropdown closes and MOVE_TASK is dispatched
            expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
                type: 'MOVE_TASK',
                payload: expect.objectContaining({
                    taskId: 'task-1',
                    destinationColId: 'col-2'
                })
            }));
        });
    });
});
