import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TaskEditor from './TaskEditor';
import React from 'react';
import { useKanban } from '../store/KanbanContext';
import { useUsers } from '../store/UserContext';
import { useAuth } from '../store/AuthContext';

vi.mock('../store/KanbanContext', () => ({
    useKanban: vi.fn()
}));

vi.mock('../store/UserContext', () => ({
    useUsers: vi.fn()
}));

vi.mock('../store/AuthContext', () => ({
    useAuth: vi.fn()
}));

vi.mock('../store/TagsContext', () => ({
    useTags: () => ({
        tags: [{ id: 'tag-bug', boardId: 'board-1', name: 'bug', color: '#94a3b8' }],
        tagMap: new Map([['tag-bug', { id: 'tag-bug', boardId: 'board-1', name: 'bug', color: '#94a3b8' }]]),
        byName: new Map([['bug', { id: 'tag-bug', boardId: 'board-1', name: 'bug', color: '#94a3b8' }]]),
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('./MarkdownEditor', () => ({
    default: ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
        <textarea data-testid="markdown-editor" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )
}));

const mockUsers = [
    { id: 'user-1', name: 'User One', email: 'user1@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
    { id: 'user-2', name: 'User Two', email: 'user2@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const }
];

const mockTask = {
    id: 'task-1',
    title: 'Existing Task',
    description: 'Task description',
    priority: 'medium' as const,
    assigneeId: 'user-1',
    tags: [{ id: 'tag-bug', boardId: 'board-1', name: 'bug', color: '#94a3b8' }],
    subTasks: [],
    checklists: [],
    comments: [],
    activities: [],
    createdAt: new Date().toISOString(),
    isArchived: false,
    sprintId: undefined
};

describe('TaskEditor', () => {
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
            renameBoard: vi.fn(),
            deleteBoard: vi.fn(),
            addBoard: vi.fn(),
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
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'user-1', name: 'User One', email: 'user1@example.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
            token: 'test-token',
            loading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
            isAuthenticated: true
        });
    });

    it('should render in create mode (no taskId)', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Create New Task')).toBeInTheDocument();
    });

    it('should render in edit mode with existing task data', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/task-1/edit']}>
                <Routes>
                    <Route path="/tasks/:taskId/edit" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Edit Task')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
    });

    it('should allow typing in title input', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const titleInput = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(titleInput, { target: { value: 'New task title' } });

        expect(titleInput).toHaveValue('New task title');
    });

    it('should allow typing in description', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const descInput = screen.getByTestId('markdown-editor');
        fireEvent.change(descInput, { target: { value: 'Task details here' } });

        expect(descInput).toHaveValue('Task details here');
    });

    it('should disable save button when title is empty', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const saveBtn = screen.getByText('Save Task').closest('button') as HTMLButtonElement;
        expect(saveBtn).toBeDisabled();
    });

    it('should enable save button when title has content', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const titleInput = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(titleInput, { target: { value: 'Valid title' } });

        const saveBtn = screen.getByText('Save Task').closest('button') as HTMLButtonElement;
        expect(saveBtn).not.toBeDisabled();
    });

    it('should dispatch ADD_TASK when saving a new task', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const titleInput = screen.getByPlaceholderText('What needs to be done?');
        fireEvent.change(titleInput, { target: { value: 'New task title' } });

        const saveBtn = screen.getByText('Save Task');
        fireEvent.click(saveBtn);

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: 'ADD_TASK',
            payload: expect.objectContaining({
                task: expect.objectContaining({
                    title: 'New task title'
                }),
                columnId: expect.any(String)
            })
        }));
    });

    it('should dispatch UPDATE_TASK when saving an existing task', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/task-1/edit']}>
                <Routes>
                    <Route path="/tasks/:taskId/edit" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const titleInput = screen.getByDisplayValue('Existing Task');
        fireEvent.change(titleInput, { target: { value: 'Updated title' } });

        const saveBtn = screen.getByText('Save Task');
        fireEvent.click(saveBtn);

        expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({
            type: 'UPDATE_TASK',
            payload: expect.objectContaining({
                task: expect.objectContaining({
                    id: 'task-1',
                    title: 'Updated title'
                })
            })
        }));
    });

    it('should navigate back when close button is clicked', () => {
        const navigateFn: (path: string) => void = () => {};
        vi.mocked(useKanban).mockReturnValue({
            state: {
                tasks: {},
                columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: [] } },
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
            renameBoard: vi.fn(),
            deleteBoard: vi.fn(),
            addBoard: vi.fn(),
            setActiveBoard: vi.fn(),
            updateTaskDueDate: vi.fn()
        });

        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                    <Route path="/" element={<div>Back to board</div>} />
                </Routes>
            </MemoryRouter>
        );

        const closeBtn = screen.getByTitle('Close');
        fireEvent.click(closeBtn);
    });

    it('should add a checklist when clicking Add Checklist', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        // Initially no checklists visible (rendered in collapsed area or empty)
        const addChecklistBtn = screen.getByText('Add Checklist');
        fireEvent.click(addChecklistBtn);

        // Should now have checklist section visible (label "Checklists" or checklist input)
        expect(screen.getByText('Checklists')).toBeInTheDocument();
    });

    it('should show priority selector with low/medium/high options', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        const priorityBtn = screen.getByText('medium');
        fireEvent.click(priorityBtn);

        expect(screen.getByText('low')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('should show assignee section', () => {
        render(
            <MemoryRouter initialEntries={['/tasks/new']}>
                <Routes>
                    <Route path="/tasks/new" element={<TaskEditor />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Assignee')).toBeInTheDocument();
        expect(screen.getByText('Priority')).toBeInTheDocument();
        expect(screen.getByText('Sprint')).toBeInTheDocument();
        expect(screen.getByText('Due Date')).toBeInTheDocument();
        expect(screen.getByText('Labels')).toBeInTheDocument();
    });
});