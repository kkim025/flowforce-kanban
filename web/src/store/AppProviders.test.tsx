import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import { AuthProvider } from './AuthContext';
import { UserProvider } from './UserContext';
import { KanbanProvider } from './KanbanContext';
import { TagsProvider } from './TagsContext';
import { ToastProvider } from '../context/ToastContext';
import { useKanban } from './KanbanContext';

// Hoisted state so the mock factory can reference it.
const state = vi.hoisted(() => ({
    loginToken: 'fake-jwt-after-login',
    loginUser: { id: 'u-1', email: 'me@example.com', name: 'Me', role: 'MEMBER' as const, status: 'ACTIVE' as const },
}));

// jsdom does not implement matchMedia; ThemeContext (mounted inside <App />)
// reads `window.matchMedia('(prefers-color-scheme: dark)')` on mount, so we
// polyfill a no-op stub here. Without this the App tree throws on first render.
if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

// Mock the network: login succeeds, /boards returns one board, /boards/{id} returns
// a board with the columns the mapper expects, /sprints returns []. Everything else
// returns an empty array (covers /users, /notifications, etc.).
vi.mock('../lib/api', () => {
    return {
        default: {
            post: vi.fn((url: string) => {
                if (url === '/auth/login') {
                    return Promise.resolve({
                        data: { access_token: state.loginToken, user: state.loginUser },
                    });
                }
                return Promise.resolve({ data: {} });
            }),
            get: vi.fn((url: string) => {
                if (url === '/boards') {
                    return Promise.resolve({ data: [{ id: 'board-1', title: 'Personal Board' }] });
                }
                if (url === '/boards/board-1') {
                    return Promise.resolve({
                        data: {
                            id: 'board-1',
                            title: 'Personal Board',
                            columns: [
                                { id: 'todo', title: 'To Do', order: 0, wipLimit: 10 },
                                { id: 'inprogress', title: 'In Progress', order: 1, wipLimit: 3 },
                                { id: 'done', title: 'Done', order: 2, wipLimit: null },
                            ],
                            tasks: [],
                        },
                    });
                }
                // Default permissive response for /users, /notifications, /sprints/...
                return Promise.resolve({ data: [] });
            }),
            patch: vi.fn(() => Promise.resolve({ data: {} })),
            put: vi.fn(() => Promise.resolve({ data: {} })),
            delete: vi.fn(() => Promise.resolve({ data: {} })),
        },
    };
});

// Mock the mapper so it doesn't need full Board shape.
vi.mock('../lib/mappers', () => ({
    mapApiBoardToState: vi.fn(() => ({
        columns: {},
        columnOrder: [],
        tasks: {},
        sprints: [],
        activeSprintId: null,
        assignees: [],
        searchQuery: '',
        selectedTaskIds: [],
        viewMode: 'board',
        dueDateFilter: 'all',
        assigneeFilter: 'all',
        priorityFilter: 'all',
        tagFilter: 'all',
    })),
}));

// Mock socket so login() can call refreshSocketAuth() without crashing and
// NotificationsProvider (mounted inside <App />) can call connect()/on()/off().
vi.mock('../lib/socket', () => ({
    getSocket: vi.fn(() => ({
        on: vi.fn(),
        off: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        connected: false,
    })),
    resetSocket: vi.fn(),
    refreshSocketAuth: vi.fn(),
}));

// Probe that reads isHydrated from the OUTER KanbanProvider (the one mounted
// in main.tsx). It must share that provider's context, so it is rendered as
// a sibling of <App /> inside the same <KanbanProvider>.
const HydrationProbe: React.FC = () => {
    const { isHydrated } = useKanban();
    return <div data-testid="hydration-probe">{isHydrated ? 'hydrated' : 'loading'}</div>;
};

// Render the real <App /> under the same provider chain as web/src/main.tsx.
// We control the initial path by rewriting window.location so App's internal
// BrowserRouter starts at /login.
const renderAppUnderProviders = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <UserProvider>
                        <TagsProvider>
                            <KanbanProvider>
                                <HydrationProbe />
                                <App />
                            </KanbanProvider>
                        </TagsProvider>
                    </UserProvider>
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>,
    );
};

describe('App-level provider tree (issue #25 regression)', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        // Start the test at /login so App's BrowserRouter renders LoginForm.
        window.history.replaceState(null, '', '/login');
    });

    it('flips KanbanProvider.isHydrated to true after login (real provider tree)', async () => {
        renderAppUnderProviders();

        // Probe begins in loading state.
        expect(screen.getByTestId('hydration-probe').textContent).toBe('loading');

        // Wait for LoginForm to render.
        await screen.findByPlaceholderText('name@example.com');

        // LoginForm lives inside <App />, so it consumes the AuthProvider that
        // App.tsx mounts (the inner one). On the unfixed code, that token
        // update never reaches the outer AuthProvider that KanbanProvider
        // reads — isHydrated stays 'loading' forever.
        fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
            target: { value: 'me@example.com' },
        });
        fireEvent.change(screen.getByPlaceholderText('••••••••'), {
            target: { value: 'hunter2' },
        });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        // After login, the (single) AuthProvider becomes authenticated,
        // ProtectedRoute lets the Board render, and KanbanProvider.loadBoardData
        // runs and flips isHydrated to true.
        await waitFor(
            () => expect(screen.getByTestId('hydration-probe').textContent).toBe('hydrated'),
            { timeout: 3000 },
        );
    });
});