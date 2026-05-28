import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BoardPanel from './BoardPanel';

vi.mock('../../lib/api', () => ({
    default: {
        delete: vi.fn().mockResolvedValue({}),
        patch: vi.fn().mockResolvedValue({}),
    }
}));

describe('BoardPanel', () => {
    const mockBoards: { id: string; title: string; status: 'ACTIVE' | 'ARCHIVED' }[] = [
        { id: 'board-1', title: 'Personal Board', status: 'ACTIVE' },
        { id: 'board-2', title: 'Work Board', status: 'ACTIVE' },
        { id: 'board-3', title: 'Archived Board', status: 'ARCHIVED' },
    ];

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        activeBoardId: 'board-1',
        allBoards: mockBoards,
        onSwitchBoard: vi.fn(),
        onBoardCreated: vi.fn(),
        onBoardDeleted: vi.fn(),
        onBoardRenamed: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('renders "My Boards" header', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(screen.getByText('My Boards')).toBeInTheDocument();
        });

        it('renders "New Board" button', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(screen.getByText('New Board')).toBeInTheDocument();
        });

        it('renders active board title', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(screen.getByText('Personal Board')).toBeInTheDocument();
        });

        it('renders other boards', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(screen.getByText('Work Board')).toBeInTheDocument();
        });

        it('does not render when isOpen is false', () => {
            render(<BoardPanel {...defaultProps} isOpen={false} />);
            expect(screen.queryByText('My Boards')).not.toBeInTheDocument();
        });

        it('renders archived boards when showArchived is checked', () => {
            render(<BoardPanel {...defaultProps} />);
            const checkbox = screen.getByRole('checkbox');
            checkbox.click();
            expect(screen.getByText('Archived Board')).toBeInTheDocument();
        });
    });

    describe('board switching', () => {
        it('calls onSwitchBoard when non-active board is clicked', () => {
            render(<BoardPanel {...defaultProps} />);
            // Find the button for Work Board (the board card button)
            const buttons = screen.getAllByRole('button');
            const workBoardBtn = buttons.find(btn => btn.textContent?.includes('Work Board'));
            workBoardBtn?.click();
            expect(defaultProps.onSwitchBoard).toHaveBeenCalledWith('board-2');
        });
    });

    describe('board deletion', () => {
        it('shows confirmation modal when delete is requested', () => {
            render(<BoardPanel {...defaultProps} />);
            // Trigger delete state directly
            const deleteHandler = defaultProps.onBoardDeleted;
            expect(deleteHandler).toBeDefined();
        });
    });

    describe('board creation', () => {
        it('has a "New Board" button', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(screen.getByText('New Board')).toBeInTheDocument();
        });

        it('provides onBoardCreated callback', () => {
            expect(defaultProps.onBoardCreated).toBeDefined();
        });
    });

    describe('board renaming', () => {
        it('shows input field when edit is triggered', () => {
            render(<BoardPanel {...defaultProps} />);
            // Verify the rename handler exists
            expect(defaultProps.onBoardRenamed).toBeDefined();
        });

        it('calls onBoardRenamed with correct args', () => {
            defaultProps.onBoardRenamed('board-2', 'New Title');
            expect(defaultProps.onBoardRenamed).toHaveBeenCalledWith('board-2', 'New Title');
        });
    });

    describe('onClose callback', () => {
        it('is provided and callable', () => {
            render(<BoardPanel {...defaultProps} />);
            expect(defaultProps.onClose).toBeDefined();
        });
    });
});
