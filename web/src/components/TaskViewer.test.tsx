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
            type: 'task_created',
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
                columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } },
                columnOrder: ['col-1'],
                selectedTaskIds: [],
                viewMode: 'board' as const,
                searchQuery: ''
            },
            dispatch,
            undo: [],
            redo: [],
            canUndo: false,
            canRedo: false
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
            state: { tasks: {}, columns: {}, columnOrder: [], selectedTaskIds: [], viewMode: 'board' as const, searchQuery: '' },
            dispatch: vi.fn(),
            undo: [],
            redo: [],
            canUndo: false,
            canRedo: false
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
                    searchQuery: ''
                },
                dispatch,
                undo: [],
                redo: [],
                canUndo: false,
                canRedo: false
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
                searchQuery: ''
            },
            dispatch,
            undo: [],
            redo: [],
            canUndo: false,
            canRedo: false
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
});
