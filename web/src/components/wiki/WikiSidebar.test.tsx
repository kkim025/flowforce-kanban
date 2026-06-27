import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WikiSidebar from './WikiSidebar';
import { WikiTreeNode } from '../../types/wiki';

// react-router context for components that call useParams/useNavigate.
function renderWithRouter(tree: WikiTreeNode[], onNewPage = vi.fn()) {
    return render(
        <MemoryRouter initialEntries={['/boards/board-1/wiki']}>
            <Routes>
                <Route
                    path="/boards/:boardId/wiki"
                    element={
                        <WikiSidebar
                            tree={tree}
                            onNewPage={onNewPage}
                        />
                    }
                />
                <Route path="/boards/:boardId/wiki/:pageId" element={<div />} />
                <Route path="/boards/:boardId/wiki/trash" element={<div />} />
            </Routes>
        </MemoryRouter>,
    );
}

const sampleTree: WikiTreeNode[] = [
    {
        page: {
            id: 'p-1',
            spaceId: 's-1',
            parentId: null,
            slug: 'welcome',
            title: 'Welcome',
            content: '',
            order: 0,
            archived: false,
            archivedAt: null,
            archivedById: null,
            createdById: 'u-1',
            updatedById: 'u-1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
        },
        children: [],
    },
    {
        page: {
            id: 'p-2',
            spaceId: 's-1',
            parentId: null,
            slug: 'spec',
            title: 'Spec',
            content: '',
            order: 1,
            archived: false,
            archivedAt: null,
            archivedById: null,
            createdById: 'u-1',
            updatedById: 'u-1',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
        },
        children: [
            {
                page: {
                    id: 'p-3',
                    spaceId: 's-1',
                    parentId: 'p-2',
                    slug: 'nested',
                    title: 'Nested',
                    content: '',
                    order: 0,
                    archived: false,
                    archivedAt: null,
                    archivedById: null,
                    createdById: 'u-1',
                    updatedById: 'u-1',
                    createdAt: '2026-01-01T00:00:00Z',
                    updatedAt: '2026-01-01T00:00:00Z',
                },
                children: [],
            },
        ],
    },
];

describe('WikiSidebar', () => {
    it('renders an empty state when tree is empty', () => {
        renderWithRouter([]);
        expect(screen.getByText(/No pages yet/i)).toBeInTheDocument();
    });

    it('renders page titles from the tree', () => {
        renderWithRouter(sampleTree);
        // Top-level + nested are both rendered. Nested is auto-expanded
        // at depth < 2 in the component default state.
        expect(screen.getByText('Welcome')).toBeInTheDocument();
        expect(screen.getByText('Spec')).toBeInTheDocument();
        expect(screen.getByText('Nested')).toBeInTheDocument();
    });

    it('calls onNewPage when the "+" button is clicked', () => {
        const onNewPage = vi.fn();
        renderWithRouter(sampleTree, onNewPage);
        // Find by title attribute (the button has no visible text).
        const button = screen.getByTitle(/New Page/i);
        fireEvent.click(button);
        expect(onNewPage).toHaveBeenCalledWith(null);
    });

    it('links each page to /boards/:boardId/wiki/:pageId', () => {
        renderWithRouter(sampleTree);
        const welcomeLink = screen.getByText('Welcome').closest('a');
        expect(welcomeLink).toHaveAttribute('href', '/boards/board-1/wiki/p-1');
    });

    it('shows a Trash link', () => {
        renderWithRouter(sampleTree);
        const trashLink = screen.getByText('Trash').closest('a');
        expect(trashLink).toHaveAttribute(
            'href',
            '/boards/board-1/wiki/trash',
        );
    });
});
