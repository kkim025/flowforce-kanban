import { useEffect, useMemo, useRef } from 'react';
import type { ToastType } from '../components/common/Toast';

type ShowToast = (message: string, type?: ToastType, duration?: number) => void;

/**
 * Schedules a one-shot toast when the JWT's `exp` claim enters the warning
 * window. Used by `AuthContext` to warn the user before expiry so they can
 * re-auth before the next API call triggers a hard 401 redirect.
 *
 * Behavior:
 * - If `token` is null/empty, the hook is a no-op.
 * - If the token cannot be decoded (malformed, missing exp), the hook is a no-op.
 * - If the token is already inside the warning window at mount, the toast fires
 *   on the next tick.
 * - Otherwise the toast fires at `exp - warningWindowMs`.
 *
 * Clock-skew caveat: comparison uses `Date.now()` (client wall clock). A user
 * whose system clock is more than `warningWindowMs` ahead of server time will
 * skip the warning and go straight to the 401 soft-logout. Without a
 * server-time handshake we can't do better client-side. Tracked for resolution
 * under refresh-token rotation (follow-up to flowforce-kanban#29).
 */
export function useTokenExpiryWarning(
  token: string | null,
  showToast: ShowToast | null,
  warningWindowMs: number,
): void {
  // Memoize the read so the effect's dep array is referentially stable.
  const exp = useMemo(() => (token ? readJwtExp(token) : null), [token]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token || !exp || !showToast) return;

    const msUntilWarning = exp - Date.now() - warningWindowMs;
    const delay = Math.max(0, msUntilWarning);

    timerRef.current = setTimeout(() => {
      showToast(
        'Your session is about to expire. Save your work and sign in again to continue.',
        'info',
        10000,
      );
    }, delay);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [token, exp, showToast, warningWindowMs]);
}

// Local copy of readJwtExp — exported from AuthContext but we inline it here
// to avoid pulling AuthContext into a hook module (AuthContext imports the
// hook; the hook must not import AuthContext).
function readJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(b64));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}