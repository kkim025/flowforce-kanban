/**
 * Single source of truth for the auth-expired window event name.
 *
 * `api.ts` dispatches this event when the server returns 401; `AuthContext`
 * listens for it to surface a soft-logout toast before navigating to /login.
 *
 * Keeping the literal in one place avoids silent breakage if the string is
 * renamed in one site and not the other (which would not be caught by tests
 * since the contract is purely runtime, not type-checked).
 */
export const AUTH_EXPIRED_EVENT = 'flowforce:auth-expired';

export interface AuthExpiredDetail {
  /** Path the user was trying to reach when the 401 fired (best-effort). */
  pathname?: string;
}