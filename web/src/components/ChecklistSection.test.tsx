import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChecklistSection from './ChecklistSection';
import { Checklist } from '../types';

describe('ChecklistSection', () => {
    const mockToggle = vi.fn();

    const checklistWithItems: Checklist = {
        id: 'cl-1',
        title: 'Test Checklist',
        taskId: 'task-1',
        items: [
            { id: 'item-1', title: 'Item 1', isCompleted: false },
            { id: 'item-2', title: 'Item 2', isCompleted: true },
        ]
    };

    const emptyChecklist: Checklist = {
        id: 'cl-2',
        title: 'Empty Checklist',
        taskId: 'task-1',
        items: []
    };

    it('should return null when checklists is undefined', () => {
        const { container } = render(
            <ChecklistSection checklists={undefined as any} onToggleChecklistItem={mockToggle} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should return null when checklists is empty', () => {
        const { container } = render(
            <ChecklistSection checklists={[]} onToggleChecklistItem={mockToggle} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should return null when all checklists have no items', () => {
        const { container } = render(
            <ChecklistSection checklists={[emptyChecklist]} onToggleChecklistItem={mockToggle} />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should render non-empty checklists', () => {
        render(
            <ChecklistSection checklists={[checklistWithItems]} onToggleChecklistItem={mockToggle} />
        );
        expect(screen.getByText('Test Checklist')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('should show correct completion count', () => {
        render(
            <ChecklistSection checklists={[checklistWithItems]} onToggleChecklistItem={mockToggle} />
        );
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });

    it('should hide empty checklists but show non-empty ones', () => {
        render(
            <ChecklistSection checklists={[emptyChecklist, checklistWithItems]} onToggleChecklistItem={mockToggle} />
        );
        expect(screen.queryByText('Empty Checklist')).not.toBeInTheDocument();
        expect(screen.getByText('Test Checklist')).toBeInTheDocument();
    });
});