import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { NotificationsProvider, useNotifications } from './NotificationsContext';

// Mock the three notification API calls loadInitial uses. Each call is
// rejected independently so we can verify Promise.all short-circuits cleanly
// through the new catch + finally path (issue #26 regression).
vi.mock('../lib/api', () => ({
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAllNotificationsRead: vi.fn(),
    markNotificationRead: vi.fn(),
    getNotificationPrefs: vi.fn(),
    upsertNotificationPref: vi.fn(),
}));

// Mock AuthContext so NotificationsProvider thinks the user is signed in.
vi.mock('./AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: true, token: 'fake-token' }),
}));

// Hoist a stable spy so individual tests can assert on it without rebuilding
// the mock factory for each case. The provider reads useToast() once
// during render and stores showToast in a closure, so we expose the spy
// reference and reset it before each test (same shape as the #25 test).
const showToastSpy = vi.fn();
vi.mock('../context/ToastContext', () => ({
    useToast: () => ({ showToast: showToastSpy }),
}));

// Capture consumer state so we can assert isInitComplete flips on the
// success path AND on the error path (issue #26 regression).
const StateProbe: React.FC = () => {
    const { isInitComplete, notifications, unreadCount, prefs } = useNotifications();
    return (
        <div>
            <div data-testid="init">{isInitComplete ? 'complete' : 'loading'}</div>
            <div data-testid="count">{notifications.length}</div>
            <div data-testid="unread">{unreadCount}</div>
            <div data-testid="prefs">{prefs.length}</div>
        </div>
    );
};

const renderWithProvider = () =>
    render(
        <NotificationsProvider>
            <StateProbe />
        </NotificationsProvider>,
    );

describe('NotificationsProvider initial load (issue #26 regression)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('flips isInitComplete to true on the happy path with state populated', async () => {
        const api = await import('../lib/api');
        vi.mocked(api.getNotifications).mockResolvedValue({
            items: [{ id: 'n1' } as any],
            nextCursor: 'cursor-1',
        } as any);
        vi.mocked(api.getUnreadCount).mockResolvedValue(3 as any);
        vi.mocked(api.getNotificationPrefs).mockResolvedValue([] as any);

        renderWithProvider();

        await waitFor(() =>
            expect(screen.getByTestId('init').textContent).toBe('complete'),
        );
        expect(screen.getByTestId('count').textContent).toBe('1');
        expect(screen.getByTestId('unread').textContent).toBe('3');
        // Happy path: no error toast.
        expect(showToastSpy).not.toHaveBeenCalled();
    });

    it('flips isInitComplete to true even when the fetches throw (was stuck silent — issue #26)', async () => {
        const api = await import('../lib/api');
        vi.mocked(api.getNotifications).mockRejectedValue(new Error('Network Error'));
        vi.mocked(api.getUnreadCount).mockRejectedValue(new Error('Network Error'));
        vi.mocked(api.getNotificationPrefs).mockRejectedValue(new Error('Network Error'));

        renderWithProvider();

        // Before the fix, isInitComplete never existed and the catch branch
        // only console.error'd — bell showed empty + no signal anything was
        // wrong (see issue #26). Now the gate flips in finally so consumers
        // can distinguish "loading" from "init finished (success or fail)".
        await waitFor(() =>
            expect(screen.getByTestId('init').textContent).toBe('complete'),
        );
    });

    it('does NOT half-set state when the init fails (notifications/unread/prefs stay at initial values)', async () => {
        const api = await import('../lib/api');
        vi.mocked(api.getNotifications).mockRejectedValue(new Error('boom'));
        vi.mocked(api.getUnreadCount).mockRejectedValue(new Error('boom'));
        vi.mocked(api.getNotificationPrefs).mockRejectedValue(new Error('boom'));

        renderWithProvider();

        await waitFor(() =>
            expect(screen.getByTestId('init').textContent).toBe('complete'),
        );
        // Coherent "init failed" state: everything at its initial value, no
        // partial commit from a successful sibling fetch in the Promise.all.
        expect(screen.getByTestId('count').textContent).toBe('0');
        expect(screen.getByTestId('unread').textContent).toBe('0');
        expect(screen.getByTestId('prefs').textContent).toBe('0');
    });

    it('surfaces the error via showToast so the user sees why notifications failed', async () => {
        const api = await import('../lib/api');
        vi.mocked(api.getNotifications).mockRejectedValue(new Error('Network Error'));
        vi.mocked(api.getUnreadCount).mockRejectedValue(new Error('Network Error'));
        vi.mocked(api.getNotificationPrefs).mockResolvedValue([] as any);

        renderWithProvider();

        await waitFor(() => expect(showToastSpy).toHaveBeenCalledTimes(1));
        const [message, type] = showToastSpy.mock.calls[0];
        expect(type).toBe('error');
        expect(message).toMatch(/Could not load notifications/);
        expect(message).toMatch(/Network Error/);
    });
});
