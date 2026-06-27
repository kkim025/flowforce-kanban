import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WikiTrash from './WikiTrash';
import { WikiTrashItem } from '../../types/wiki';

vi.mock('../../lib/wiki', () => ({
    getWikiTrash: vi.fn(),
    restoreWikiPage: vi.fn(),
    hardDeleteWikiPage: vi.fn(),
}));
// Stable reference: useToast must return the same object across
// renders or useEffect/useCallback deps will churn and cause
// infinite re-fetches.
const stableToast = { showToast: vi.fn() };
vi.mock('../../hooks/useToast', () => ({
    useToast: () => stableToast,
}));

import * as wikiApi from '../../lib/wiki';

const trashedPages: WikiTrashItem[] = [
    {
        page: {
            id: 'p-1',
            spaceId: 's-1',
            parentId: null,
            slug: 'doomed',
            title: 'Doomed',
            content: '',
            order: 0,
            archived: true,
            archivedAt: '2026-02-01T00:00:00Z',
            archivedById: 'u-1',
            createdById: 'u-1',
            updatedById: 'u-1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-02-01T00:00:00Z',
        },
        breadcrumb: null,
    },
];

beforeEach(() => {
    vi.mocked(wikiApi.getWikiTrash).mockReset();
    vi.mocked(wikiApi.restoreWikiPage).mockReset();
    vi.mocked(wikiApi.hardDeleteWikiPage).mockReset();
    vi.mocked(wikiApi.getWikiTrash).mockResolvedValue(trashedPages);
});

afterEach(() => {
    cleanup();
});

describe('WikiTrash', () => {
    it('shows empty state when trash is empty', async () => {
        vi.mocked(wikiApi.getWikiTrash).mockResolvedValue([]);
        render(
            <MemoryRouter>
                <WikiTrash boardId="b-1" />
            </MemoryRouter>,
        );
        expect(await screen.findByText(/Trash is empty/i)).toBeInTheDocument();
    });

    it('lists archived pages', async () => {
        render(
            <MemoryRouter>
                <WikiTrash boardId="b-1" />
            </MemoryRouter>,
        );
        const item = await screen.findByTestId('wiki-trash-item');
        expect(item).toHaveTextContent('Doomed');
    });

    it('calls restoreWikiPage when restore button is clicked', async () => {
        render(
            <MemoryRouter>
                <WikiTrash boardId="b-1" />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-trash-item');
        const restoreBtn = screen.getByTitle(/Restore/i);
        fireEvent.click(restoreBtn);
        await waitFor(() => {
            expect(wikiApi.restoreWikiPage).toHaveBeenCalledWith('b-1', 'p-1');
        });
    });

    it('opens confirm modal on delete-forever and disables button until title matches', async () => {
        render(
            <MemoryRouter>
                <WikiTrash boardId="b-1" />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-trash-item');
        await act(async () => {
            fireEvent.click(screen.getByTestId('wiki-trash-delete-forever'));
        });
        const input = await screen.findByTestId('wiki-trash-confirm-input');
        const confirmBtn = screen.getByTestId('wiki-trash-confirm-button');
        // Disabled with empty input.
        expect(confirmBtn).toBeDisabled();

        // Wrong text — still disabled.
        await act(async () => {
            fireEvent.change(input, { target: { value: 'wrong' } });
        });
        expect(confirmBtn).toBeDisabled();

        // Matching title enables the button.
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Doomed' } });
        });
        expect(confirmBtn).not.toBeDisabled();
    });

    it('calls hardDeleteWikiPage after title-match confirm', async () => {
        render(
            <MemoryRouter>
                <WikiTrash boardId="b-1" />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-trash-item');
        await act(async () => {
            fireEvent.click(screen.getByTestId('wiki-trash-delete-forever'));
        });
        const input = await screen.findByTestId('wiki-trash-confirm-input');
        await act(async () => {
            fireEvent.change(input, { target: { value: 'Doomed' } });
        });
        // Wait for the button to become enabled (state committed)
        // before clicking — otherwise the click is dropped on the floor.
        const confirmBtn = await screen.findByTestId(
            'wiki-trash-confirm-button',
        );
        await waitFor(() => expect(confirmBtn).not.toBeDisabled());
        await act(async () => {
            fireEvent.click(confirmBtn);
        });
        await waitFor(() => {
            expect(wikiApi.hardDeleteWikiPage).toHaveBeenCalledWith(
                'b-1',
                'p-1',
            );
        });
    });
});
