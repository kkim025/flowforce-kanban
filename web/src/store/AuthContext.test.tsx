import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act, screen } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth, readJwtExp } from './AuthContext';

// Mocks ---------------------------------------------------------------------

vi.mock('../lib/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// vi.mock factories are hoisted to the top of the file, so any state they
// reference must live inside vi.hoisted() — otherwise vitest throws
// "Cannot access X before initialization".
const toastState = vi.hoisted(() => ({ showToast: vi.fn() }));
vi.mock('../context/ToastContext', () => ({
  ToastContext: React.createContext({ showToast: toastState.showToast }),
}));

vi.mock('../lib/socket', () => ({
  refreshSocketAuth: vi.fn(),
}));

vi.mock('../lib/auth-events', () => ({
  AUTH_EXPIRED_EVENT: 'flowforce:auth-expired',
}));

// Helpers -------------------------------------------------------------------

// Build a JWT-shaped token with the given exp (seconds since epoch).
function makeJwt(expSeconds: number): string {
  const payload = Buffer.from(JSON.stringify({ exp: expSeconds, iat: 0 }))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `header.${payload}.signature`;
}

const AuthProbe: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  return (
    <div>
      <div data-testid="auth">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user-email">{user?.email ?? ''}</div>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>,
  );

beforeEach(() => {
  localStorage.clear();
  toastState.showToast.mockReset();
});

// Tests ---------------------------------------------------------------------

describe('readJwtExp', () => {
  it('returns exp * 1000 for a valid token', () => {
    expect(readJwtExp(makeJwt(1_700_000_000))).toBe(1_700_000_000 * 1000);
  });

  it('returns null for a non-JWT string', () => {
    expect(readJwtExp('not-a-jwt')).toBeNull();
  });

  it('returns null for a payload with no exp claim', () => {
    const payload = Buffer.from(JSON.stringify({ iat: 0 }))
      .toString('base64')
      .replace(/=+$/, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    expect(readJwtExp(`header.${payload}.signature`)).toBeNull();
  });
});

describe('AuthProvider initial load (issue #29 regression)', () => {
  it('rejects an already-expired token from localStorage', async () => {
    const expiredToken = makeJwt(Math.floor(Date.now() / 1000) - 60);
    localStorage.setItem('flowforce_token', expiredToken);
    localStorage.setItem(
      'flowforce_user',
      JSON.stringify({ id: 'u-1', email: 'me@example.com', role: 'MEMBER', status: 'ACTIVE' }),
    );

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('no'));
    expect(localStorage.getItem('flowforce_token')).toBeNull();
    expect(localStorage.getItem('flowforce_user')).toBeNull();
  });

  it('accepts a non-expired token from localStorage', async () => {
    const futureToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('flowforce_token', futureToken);
    localStorage.setItem(
      'flowforce_user',
      JSON.stringify({ id: 'u-1', email: 'me@example.com', role: 'MEMBER', status: 'ACTIVE' }),
    );

    renderWithProvider();

    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));
    expect(screen.getByTestId('user-email').textContent).toBe('me@example.com');
  });
});

describe('AuthProvider pre-expiry warning (issue #29)', () => {
  it('fires the warning immediately if the token is already inside the warning window', async () => {
    // 30 seconds in the future → inside the 60s warning window
    const nearExpiryToken = makeJwt(Math.floor(Date.now() / 1000) + 30);
    localStorage.setItem('flowforce_token', nearExpiryToken);
    localStorage.setItem(
      'flowforce_user',
      JSON.stringify({ id: 'u-1', email: 'me@example.com', role: 'MEMBER', status: 'ACTIVE' }),
    );

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));

    // delay = Math.max(0, msUntilWarning) = 0 → setTimeout fires on the next
    // tick. waitFor polls until the toast is called.
    await waitFor(() =>
      expect(toastState.showToast).toHaveBeenCalledWith(
        expect.stringContaining('about to expire'),
        'info',
        10000,
      ),
    );
  });

  it('does not fire the warning if the token is far from expiry', async () => {
    // 1 hour in the future → 59 minutes outside the warning window
    const farExpiryToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('flowforce_token', farExpiryToken);
    localStorage.setItem(
      'flowforce_user',
      JSON.stringify({ id: 'u-1', email: 'me@example.com', role: 'MEMBER', status: 'ACTIVE' }),
    );

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));

    // Wait a short real-time interval — way less than the 59-minute window
    // — to give any spurious timer a chance to fire, then assert it did not.
    await new Promise((r) => setTimeout(r, 100));

    expect(toastState.showToast).not.toHaveBeenCalledWith(
      expect.stringContaining('about to expire'),
      expect.anything(),
      expect.anything(),
    );
  });
});

describe('AuthProvider 401 soft-logout (issue #29)', () => {
  it('shows toast and clears state when flowforce:auth-expired fires with a prior token', async () => {
    const futureToken = makeJwt(Math.floor(Date.now() / 1000) + 3600);
    localStorage.setItem('flowforce_token', futureToken);
    localStorage.setItem(
      'flowforce_user',
      JSON.stringify({ id: 'u-1', email: 'me@example.com', role: 'MEMBER', status: 'ACTIVE' }),
    );

    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('auth').textContent).toBe('yes'));

    // Simulate the api.ts interceptor dispatching the event.
    act(() => {
      window.dispatchEvent(new CustomEvent('flowforce:auth-expired'));
    });

    // Toast fires synchronously inside the handler.
    expect(toastState.showToast).toHaveBeenCalledWith(
      'Your session expired. Please sign in again.',
      'info',
      5000,
    );

    // State and storage are cleared synchronously (logout() runs before
    // the deferred redirect).
    expect(localStorage.getItem('flowforce_token')).toBeNull();
    expect(localStorage.getItem('flowforce_user')).toBeNull();
    expect(screen.getByTestId('auth').textContent).toBe('no');
  });
});