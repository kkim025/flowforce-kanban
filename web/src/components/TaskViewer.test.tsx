import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    priority: 'medium' as const,
    assigneeId: 'user-1',
    tags: ['bug'],
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
            createdAt: new Date().toISOString()
        }
    ],
    createdAt: new Date().toISOString()
};

const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@example.com' }
];

describe('TaskViewer', () => {
    const dispatch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useKanban).mockReturnValue({
            state: { 
                tasks: { 'task-1': mockTask },
                columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } }
            },
            dispatch
        });
        vi.mocked(useUsers).mockReturnValue({ users: mockUsers });
        vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } });
    });

    it('should show "Task not found" when taskId is invalid', () => {
        vi.mocked(useKanban).mockReturnValue({
            state: { tasks: {}, columns: {} },
            dispatch: vi.fn()
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

        // Verify confirmation modal is shown - use getAllByText or specific roles
        expect(screen.getByRole('heading', { name: 'Delete Comment' })).toBeInTheDocument();
        expect(screen.getByText('Are you sure you want to delete this comment?')).toBeInTheDocument();

        // Confirm deletion in the modal
        const confirmButtons = screen.getAllByText('Delete Comment');
        const confirmButton = confirmButtons.find(btn => btn.tagName === 'BUTTON');
        if (confirmButton) fireEvent.click(confirmButton);

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: 'DELETE_COMMENT',
            payload: {
                taskId: 'task-1',
                commentId: 'comment-1'
            }
        }));
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

    it('should handle missing description gracefully', () => {
        const taskNoDesc = { ...mockTask, description: '' };
        vi.mocked(useKanban).mockReturnValue({
            state: { 
                tasks: { 'task-1': taskNoDesc },
                columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1'] } }
            },
            dispatch
        });

        render(
            <MemoryRouter initialEntries={['/tasks/task-1']}>
                <Routes>
                    <Route path="/tasks/:taskId" element={<TaskViewer />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('No description provided.')).toBeInTheDocument();
    });
});
