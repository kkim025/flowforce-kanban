import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { KanbanProvider, useKanban } from './KanbanContext';

// Mock the API module so we can control whether /boards succeeds or throws.
vi.mock('../lib/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

// Mock AuthContext so the KanbanProvider thinks the user is signed in.
vi.mock('./AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, token: 'fake-token' }),
}));

// Mock the mapper so it doesn't try to read fields we don't care about here.
vi.mock('../lib/mappers', () => ({
    mapApiBoardToState: vi.fn(() => ({
        columns: {},
        columnOrder: [],
        tasks: {},
        sprints: [],
        activeSprintId: null,
        assignees: [],
    })),
}));

// Hoist a stable spy so individual tests can assert on it without rebuilding
// the mock factory for each case. The KanbanProvider reads useToast() once
// during render and stores showToast in a closure, so we expose the spy
// reference and reset it before each test.
const showToastSpy = vi.fn();
vi.mock('../context/ToastContext', () => ({
    useToast: () => ({ showToast: showToastSpy }),
}));

// Capture consumer state so we can assert isHydrated flips on the success path
// AND on the error path (issue #25 regression).
const StateProbe: React.FC = () => {
    const { isHydrated } = useKanban();
    return <div data-testid="probe">{isHydrated ? 'hydrated' : 'loading'}</div>;
};

const renderWithProvider = () =>
    render(
        <KanbanProvider>
            <StateProbe />
        </KanbanProvider>,
    );

describe('KanbanProvider initial hydration (issue #25 regression)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('flips isHydrated to true on the happy path', async () => {
        const api = (await import('../lib/api')).default;
        // Make every API call resolve. The first GET returns a non-empty list
        // so we skip the auto-create branch; subsequent GETs return shapes the
        // mocked mapper ignores.
        vi.mocked(api.get).mockResolvedValue({
            data: [{ id: 'board-1', title: 'Personal Board' }],
        } as any);

        renderWithProvider();

        await waitFor(() =>
            expect(screen.getByTestId('probe').textContent).toBe('hydrated'),
        );
        // Happy path: no error toast.
        expect(showToastSpy).not.toHaveBeenCalled();
    });

    it('flips isHydrated to true even when /boards throws (was stuck on Loading Board... forever)', async () => {
        const api = (await import('../lib/api')).default;
        vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

        renderWithProvider();

        // Before the fix, this would never resolve — isHydrated stayed false
        // because the catch branch only console.error'd, leaving the
        // "Loading Board..." spinner hung forever (see issue #25).
        await waitFor(() =>
            expect(screen.getByTestId('probe').textContent).toBe('hydrated'),
        );
    });

    it('surfaces the error via showToast so the user sees why loading failed', async () => {
        const api = (await import('../lib/api')).default;
        vi.mocked(api.get).mockRejectedValueOnce(new Error('Network Error'));

        renderWithProvider();

        await waitFor(() => expect(showToastSpy).toHaveBeenCalledTimes(1));
        const [message, type] = showToastSpy.mock.calls[0];
        expect(type).toBe('error');
        expect(message).toMatch(/Could not load your boards/);
        expect(message).toMatch(/Network Error/);
    });
});