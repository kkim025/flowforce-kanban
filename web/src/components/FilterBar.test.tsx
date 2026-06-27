import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FilterBar from './FilterBar';

const mockState = {
    tasks: {
        'task-1': { id: 'task-1', title: 'Task 1', description: '', priority: 'high' as const, tags: [{ id: 'tag-frontend', boardId: 'b1', name: 'frontend', color: '#3b82f6' }, { id: 'tag-bug', boardId: 'b1', name: 'bug', color: '#ef4444' }], assigneeId: 'user-1', subTasks: [], checklists: [], comments: [], activities: [], createdAt: '' },
                'task-2': { id: 'task-2', title: 'Task 2', description: '', priority: 'low' as const, tags: [{ id: 'tag-backend', boardId: 'b1', name: 'backend', color: '#10b981' }], assigneeId: 'user-2', subTasks: [], checklists: [], comments: [], activities: [], createdAt: '' },
    },
    columns: { 'col-1': { id: 'col-1', title: 'Todo', taskIds: ['task-1', 'task-2'] } },
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
    assignees: [
        { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
        { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
    ],
};

const mockDispatch = vi.fn();

const mockUsers = [
    { id: 'user-1', name: 'Alice', email: 'alice@test.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
    { id: 'user-2', name: 'Bob', email: 'bob@test.com', role: 'MEMBER' as const, status: 'ACTIVE' as const },
];

const mockTags = [
    { id: 'tag-frontend', boardId: 'b1', name: 'frontend', color: '#3b82f6' },
    { id: 'tag-backend', boardId: 'b1', name: 'backend', color: '#10b981' },
    { id: 'tag-bug', boardId: 'b1', name: 'bug', color: '#ef4444' },
];

vi.mock('../store/KanbanContext', () => ({
    useKanban: () => ({ state: mockState, dispatch: mockDispatch }),
}));

vi.mock('../store/UserContext', () => ({
    useUsers: () => ({ users: mockUsers }),
}));

vi.mock('../store/TagsContext', () => ({
    useTags: () => ({
        tags: mockTags,
        tagMap: new Map(mockTags.map((t) => [t.id, t])),
        byName: new Map(mockTags.map((t) => [t.name, t])),
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    }),
}));

describe('FilterBar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders filter button', () => {
        render(<FilterBar />);
        expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    it('opens filter panel on click', () => {
        render(<FilterBar />);
        fireEvent.click(screen.getByText('Filters'));
        expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });

    it('shows assignee dropdown when assignee section clicked', () => {
        render(<FilterBar />);
        fireEvent.click(screen.getByText('Filters'));
        expect(screen.getByText('All Assignees')).toBeInTheDocument();
    });

    it('shows priority options when priority dropdown clicked', () => {
        render(<FilterBar />);
        fireEvent.click(screen.getByText('Filters'));
        fireEvent.click(screen.getByText('All Priorities'));
        expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('shows tags from tasks', () => {
        render(<FilterBar />);
        fireEvent.click(screen.getByText('Filters'));
        expect(screen.getByText('#frontend')).toBeInTheDocument();
        expect(screen.getByText('#backend')).toBeInTheDocument();
    });
});