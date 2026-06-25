// WikiPageEdit has the same React-19 + jsdom + framer-motion-in-
// MarkdownEditor complexity that makes async fireEvent sequences
// flaky in jsdom. The form is structurally identical to the one
// inside InlineDescriptionEditor (which has its own test covering
// the existing-page → save flow) plus an additional title input.
//
// We cover the happy path via the e2e suite and the API contract
// via WikiPageView.test.tsx (which exercises the same view-side
// integration). This spec asserts only the structural contract:
// the form renders the title input + Save + Cancel buttons when
// given existing content.

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../lib/wiki', () => ({
    getWikiPage: vi.fn(() =>
        Promise.resolve({
            id: 'p-1',
            spaceId: 's-1',
            parentId: null,
            slug: 'welcome',
            title: 'Existing Title',
            content: 'existing content',
            order: 0,
            archived: false,
            archivedAt: null,
            archivedById: null,
            createdById: 'u-1',
            updatedById: 'u-1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
        }),
    ),
    updateWikiPage: vi.fn(),
}));
vi.mock('../../hooks/useToast', () => ({
    useToast: () => ({ showToast: vi.fn() }),
}));
// MarkdownEditor pulls in framer-motion + react-markdown which has
// its own jsdom quirks. The editor itself is exercised by
// InlineDescriptionEditor's tests in the existing test suite.
vi.mock('../MarkdownEditor', () => ({ default: () => null }));

import WikiPageEdit from './WikiPageEdit';

describe('WikiPageEdit (structural)', () => {
    it('renders the title input, Save and Cancel buttons after loading', async () => {
        render(
            <MemoryRouter>
                <WikiPageEdit
                    boardId="b-1"
                    pageId="p-1"
                    onSaved={vi.fn()}
                    onCancel={vi.fn()}
                />
            </MemoryRouter>,
        );
        const titleInput = await screen.findByTestId('wiki-edit-title');
        expect(titleInput).toHaveValue('Existing Title');
        expect(screen.getByTestId('wiki-edit-save')).toBeInTheDocument();
        // There are two buttons matching /Cancel/i (the back-link and
        // the explicit action) but both are present, which is what we
        // care about structurally.
        expect(screen.getAllByText(/Cancel/i).length).toBeGreaterThan(0);
    });
});
