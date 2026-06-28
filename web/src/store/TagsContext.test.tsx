import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React, { useEffect } from 'react';
import { TagsProvider, useTags } from './TagsContext';

// Mock just the api module's tag functions. Without the fix, every TagsProvider
// re-render leaks a new context value object → consumer useEffect with [tags]
// in deps refires forever → infinite loop of GET /tags requests.
vi.mock('../lib/api', () => ({
    getTags: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

import { getTags } from '../lib/api';
const getTagsMock = vi.mocked(getTags);

/**
 * Mirrors the FIXED pattern from `web/src/components/Board.tsx` (issue #32):
 *   const { refresh: refreshTags } = useTags();
 *   useEffect(() => { refreshTags(boardId); }, [boardId, refreshTags]);
 *
 * `refreshTags` is a stable `useCallback([], [])` from TagsContext, so the
 * effect deps don't churn on every render and the loop is bounded.
 */
const BoardLike: React.FC<{ boardId: string }> = ({ boardId }) => {
    const { refresh: refreshTags } = useTags();
    useEffect(() => {
        if (boardId) void refreshTags(boardId);
    }, [boardId, refreshTags]);
    return null;
};

describe('TagsContext — issue #32 refetch loop', () => {
    beforeEach(() => {
        getTagsMock.mockReset();
        getTagsMock.mockResolvedValue([]);
    });

    it('TagsContext value reference is stable across re-renders', () => {
        const refs: unknown[] = [];
        const Probe = () => {
            refs.push(useTags());
            return null;
        };

        const { rerender } = render(
            <TagsProvider>
                <Probe />
            </TagsProvider>,
        );
        rerender(
            <TagsProvider>
                <Probe />
            </TagsProvider>,
        );

        // Same reference on the second render → the Provider value is stable.
        // Without the useMemo fix, refs[1] !== refs[0] (new object literal every
        // render), which would cause any consumer's useEffect dep on `tags` to
        // re-fire on every render.
        expect(refs[1]).toBe(refs[0]);
    });

    it('does not call GET /tags in a loop when a Board-like consumer mounts', async () => {
        render(
            <TagsProvider>
                <BoardLike boardId="board-1" />
            </TagsProvider>,
        );

        // waitFor retries the assertion until it passes or times out.
        // - Fixed code: refresh is called exactly once on mount → passes.
        // - Unfixed code: count grows past 1 and never recovers → times out.
        await waitFor(
            () => expect(getTagsMock).toHaveBeenCalledTimes(1),
            { timeout: 1000 },
        );
    });

    it('re-fetches exactly once when activeBoardId changes A → B', async () => {
        const { rerender } = render(
            <TagsProvider>
                <BoardLike boardId="board-A" />
            </TagsProvider>,
        );
        await waitFor(() => expect(getTagsMock).toHaveBeenCalledTimes(1));
        expect(getTagsMock).toHaveBeenLastCalledWith('board-A');

        rerender(
            <TagsProvider>
                <BoardLike boardId="board-B" />
            </TagsProvider>,
        );
        await waitFor(() => expect(getTagsMock).toHaveBeenCalledTimes(2));
        expect(getTagsMock).toHaveBeenLastCalledWith('board-B');
    });
});