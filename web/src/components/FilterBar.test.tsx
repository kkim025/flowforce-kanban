import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FilterBar from './FilterBar';

const mockState = {
    tasks: {
        'task-1': { id: 'task-1', title: 'Task 1', description: '', priority: 'high' as const, tags: ['frontend', 'bug'], assigneeId: 'user-1', subTasks: [], checklists: [], comments: [], activities: [], createdAt: '' },
        'task-2': { id: 'task-2', title: 'Task 2', description: '', priority: 'low' as const, tags: ['backend'], assigneeId: 'user-2', subTasks: [], checklists: [], comments: [], activities: [], createdAt: '' },
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

vi.mock('../store/KanbanContext', () => ({
    useKanban: () => ({ state: mockState, dispatch: mockDispatch }),
}));

vi.mock('../store/UserContext', () => ({
    useUsers: () => ({ users: mockUsers }),
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