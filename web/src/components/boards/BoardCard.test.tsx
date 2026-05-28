import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardCard from './BoardCard';

describe('BoardCard', () => {
    const defaultProps = {
        id: 'board-1',
        title: 'Test Board',
        status: 'ACTIVE' as const,
        isActive: false,
        onClick: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('inactive board', () => {
        it('renders title correctly', () => {
            render(<BoardCard {...defaultProps} />);
            expect(screen.getByText('Test Board')).toBeInTheDocument();
        });

        it('calls onClick when board button is clicked', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /test board/i }));
            expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
        });

        it('shows edit button when onEdit is provided', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.getByRole('button', { name: /rename board/i })).toBeInTheDocument();
        });

        it('shows delete button when onDelete is provided', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.getByRole('button', { name: /delete board/i })).toBeInTheDocument();
        });

        it('calls onEdit when pencil button is clicked', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            fireEvent.click(screen.getByRole('button', { name: /rename board/i }));
            expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
        });

        it('calls onDelete when trash button is clicked', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            fireEvent.click(screen.getByRole('button', { name: /delete board/i }));
            expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
        });

        it('stops event propagation when edit button is clicked', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            fireEvent.click(screen.getByRole('button', { name: /rename board/i }));
            expect(defaultProps.onClick).not.toHaveBeenCalled();
        });

        it('stops event propagation when delete button is clicked', () => {
            render(<BoardCard {...defaultProps} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            fireEvent.click(screen.getByRole('button', { name: /delete board/i }));
            expect(defaultProps.onClick).not.toHaveBeenCalled();
        });
    });

    describe('active board', () => {
        it('renders title correctly', () => {
            render(<BoardCard {...defaultProps} isActive={true} />);
            expect(screen.getByText('Test Board')).toBeInTheDocument();
        });

        it('does not call onClick when clicked', () => {
            render(<BoardCard {...defaultProps} isActive={true} />);
            fireEvent.click(screen.getByText('Test Board'));
            expect(defaultProps.onClick).not.toHaveBeenCalled();
        });

        it('shows edit button when onEdit is provided', () => {
            render(<BoardCard {...defaultProps} isActive={true} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.getByRole('button', { name: /rename board/i })).toBeInTheDocument();
        });

        it('does not show delete button', () => {
            render(<BoardCard {...defaultProps} isActive={true} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.queryByRole('button', { name: /delete board/i })).not.toBeInTheDocument();
        });

        it('calls onEdit when pencil button is clicked on active board', () => {
            render(<BoardCard {...defaultProps} isActive={true} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            fireEvent.click(screen.getByRole('button', { name: /rename board/i }));
            expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
        });
    });

    describe('without onEdit callback', () => {
        it('does not show edit button', () => {
            render(<BoardCard {...defaultProps} onEdit={undefined} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.queryByRole('button', { name: /rename board/i })).not.toBeInTheDocument();
        });
    });

    describe('without onDelete callback', () => {
        it('does not show delete button', () => {
            render(<BoardCard {...defaultProps} onDelete={undefined} />);
            fireEvent.mouseEnter(screen.getByText('Test Board'));
            expect(screen.queryByRole('button', { name: /delete board/i })).not.toBeInTheDocument();
        });
    });
});
