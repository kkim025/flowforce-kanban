import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import WikiPageView from './WikiPageView';
import { WikiPage, WikiVersion } from '../../types/wiki';

// Mock the wiki API module so we don't touch axios.
vi.mock('../../lib/wiki', () => ({
    getWikiPage: vi.fn(),
    archiveWikiPage: vi.fn(),
    listWikiVersions: vi.fn(),
    restoreWikiVersion: vi.fn(),
}));

// Mock useToast so we don't need to wrap in ToastProvider.
// Use a stable reference so useCallback deps don't churn.
const stableToast = { showToast: vi.fn() };
vi.mock('../../hooks/useToast', () => ({
    useToast: () => stableToast,
}));

import * as wikiApi from '../../lib/wiki';

const samplePage: WikiPage = {
    id: 'p-1',
    spaceId: 's-1',
    parentId: null,
    slug: 'welcome',
    title: 'Welcome',
    content: '# Hello\n\nThis is **bold** and `code`.',
    order: 0,
    archived: false,
    archivedAt: null,
    archivedById: null,
    createdById: 'u-1',
    updatedById: 'u-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
};

const sampleVersions: WikiVersion[] = [
    {
        id: 'v-2',
        pageId: 'p-1',
        revisionNo: 2,
        title: 'Welcome',
        content: 'v2 content',
        editorId: 'u-1',
        createdAt: '2026-01-02T00:00:00Z',
    },
    {
        id: 'v-1',
        pageId: 'p-1',
        revisionNo: 1,
        title: 'Welcome',
        content: 'v1 content',
        editorId: 'u-1',
        createdAt: '2026-01-01T00:00:00Z',
    },
];

beforeEach(() => {
    vi.mocked(wikiApi.getWikiPage).mockReset();
    vi.mocked(wikiApi.archiveWikiPage).mockReset();
    vi.mocked(wikiApi.listWikiVersions).mockReset();
    vi.mocked(wikiApi.restoreWikiVersion).mockReset();
    vi.mocked(wikiApi.getWikiPage).mockResolvedValue(samplePage);
    vi.mocked(wikiApi.listWikiVersions).mockResolvedValue(sampleVersions);
});

describe('WikiPageView', () => {
    it('renders the page title and markdown content', async () => {
        render(
            <MemoryRouter>
                <WikiPageView
                    boardId="b-1"
                    pageId="p-1"
                    onEdit={vi.fn()}
                    onDeleted={vi.fn()}
                />
            </MemoryRouter>,
        );
        const titleEl = await screen.findByTestId('wiki-page-title');
        expect(titleEl).toHaveTextContent('Welcome');
        const contentEl = screen.getByTestId('wiki-page-content');
        expect(contentEl.textContent).toContain('Hello');
        expect(contentEl.textContent).toContain('bold');
        expect(contentEl.textContent).toContain('code');
    });

    it('strips <script> tags via rehype-sanitize', async () => {
        const malicious: WikiPage = {
            ...samplePage,
            content:
                'Hello\n\n<script>window.__pwned = true;</script>\n\n<img src=x onerror="window.__pwned2=true" />',
        };
        vi.mocked(wikiApi.getWikiPage).mockResolvedValue(malicious);
        render(
            <MemoryRouter>
                <WikiPageView
                    boardId="b-1"
                    pageId="p-1"
                    onEdit={vi.fn()}
                    onDeleted={vi.fn()}
                />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-page-title');
        // The DOM must not contain script or onerror handlers.
        expect(document.querySelectorAll('script')).toHaveLength(0);
        const imgs = document.querySelectorAll('img');
        imgs.forEach((img) => {
            expect(img.getAttribute('onerror')).toBeNull();
        });
    });

    it('calls onEdit when the edit button is clicked', async () => {
        const onEdit = vi.fn();
        render(
            <MemoryRouter>
                <WikiPageView
                    boardId="b-1"
                    pageId="p-1"
                    onEdit={onEdit}
                    onDeleted={vi.fn()}
                />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-page-title');
        fireEvent.click(screen.getByTestId('wiki-edit-button'));
        expect(onEdit).toHaveBeenCalled();
    });

    it('opens the history drawer and lists versions', async () => {
        render(
            <MemoryRouter>
                <WikiPageView
                    boardId="b-1"
                    pageId="p-1"
                    onEdit={vi.fn()}
                    onDeleted={vi.fn()}
                />
            </MemoryRouter>,
        );
        await screen.findByTestId('wiki-page-title');
        await act(async () => {
            fireEvent.click(screen.getByTestId('wiki-history-toggle'));
        });
        await waitFor(() => {
            expect(wikiApi.listWikiVersions).toHaveBeenCalled();
        });
        // Each version row has a Restore button. Two versions → two
        // restore buttons. Also assert the dropdown defaults to 50.
        const restoreButtons = await screen.findAllByTestId(
            'wiki-history-restore',
        );
        expect(restoreButtons).toHaveLength(2);
        const limitSelect = screen.getByTestId(
            'wiki-history-limit',
        ) as HTMLSelectElement;
        expect(limitSelect.value).toBe('50');
    });
});
