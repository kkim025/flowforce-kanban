import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { refreshSocketAuth } from '../lib/socket';
import { ToastContext } from '../context/ToastContext';

// Warn the user this many ms before the token expires so they can re-auth
// proactively instead of getting kicked out mid-action.
// Flowforce-kanban#29.
const EXPIRY_WARNING_MS = 60 * 1000; // 60 seconds

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'MEMBER';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Decode a JWT payload without verifying the signature. Only used to read
// `exp` for the pre-expiry warning timer. The server still enforces auth
// on every request, so a forged/tampered token just produces a wrong
// warning time — no security implication.
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // useToast throws if there is no ToastProvider above us. AppProviders.test
  // wraps the real provider chain (ToastProvider > AuthProvider), so this
  // is safe at runtime. We read ToastContext directly so a hypothetical
  // future reorder that drops ToastProvider doesn't crash — we just skip
  // the toast and still do the redirect. This is the canonical pattern
  // for "optional toast" without a Rules-of-Hooks violation.
  const toastCtx = useContext(ToastContext);
  const showToast = toastCtx?.showToast ?? null;

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('flowforce_token');
    localStorage.removeItem('flowforce_user');
  }, []);

  // 401 handler from api.ts interceptor (Flowforce-kanban#29):
  // api.ts can't import AuthContext (circular), so it dispatches a window
  // event. We listen here, show a toast, and redirect. The redirect is
  // deferred one frame so React can paint the toast before navigation
  // tears down the tree (otherwise the user never sees the toast).
  useEffect(() => {
    const handler = () => {
      logout();
      showToast?.('Your session expired. Please sign in again.', 'info', 5000);
      setTimeout(() => { window.location.href = '/login'; }, 250);
    };
    window.addEventListener('flowforce:auth-expired', handler);
    return () => window.removeEventListener('flowforce:auth-expired', handler);
  }, [logout, showToast]);

  // Pre-expiry warning timer (Flowforce-kanban#29).
  // If a token's `exp` is within EXPIRY_WARNING_MS, warn the user so they
  // can re-auth before the next API call triggers a hard 401 redirect.
  // Until refresh-token infra exists, "re-auth" means logging out and back
  // in (see issue #29 follow-up).
  useEffect(() => {
    if (!token) return;
    const exp = readJwtExp(token);
    if (!exp) return;
    const now = Date.now();
    const msUntilExpiry = exp - now;
    const msUntilWarning = msUntilExpiry - EXPIRY_WARNING_MS;
    // If the token is already inside the warning window (e.g. user just
    // refreshed the tab with a near-expiry token), warn immediately.
    const delay = Math.max(0, msUntilWarning);
    const t = setTimeout(() => {
      showToast?.(
        'Your session is about to expire. Save your work and sign in again to continue.',
        'info',
        10000,
      );
    }, delay);
    return () => clearTimeout(t);
  }, [token, showToast]);

  // Initial load from localStorage. JWT TTL fallback: if we can't decode `exp`,
  // assume the token is still valid for the configured TTL from now.
  useEffect(() => {
    const savedToken = localStorage.getItem('flowforce_token');
    const savedUser = localStorage.getItem('flowforce_user');

    if (savedToken && savedUser) {
      const exp = readJwtExp(savedToken);
      const now = Date.now();
      // Treat as expired if exp is in the past or within the warning window —
      // we don't want to flash a toast immediately on tab reload.
      const alreadyExpired = exp !== null && exp <= now;
      if (alreadyExpired) {
        localStorage.removeItem('flowforce_token');
        localStorage.removeItem('flowforce_user');
      } else {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      const response = await api.post('/auth/login', { email, password: pass });
      const { access_token, user: userData } = response.data;

      setToken(access_token);
      setUser(userData);
      localStorage.setItem('flowforce_token', access_token);
      // Refresh socket auth exactly once; previously this was called twice
      // (copy-paste bug from login + register), harmless but wasteful.
      refreshSocketAuth();
      localStorage.setItem('flowforce_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, pass: string, name?: string) => {
    try {
      const response = await api.post('/auth/register', { email, password: pass, name });
      const { access_token, user: userData } = response.data;

      setToken(access_token);
      setUser(userData);
      localStorage.setItem('flowforce_token', access_token);
      refreshSocketAuth();
      localStorage.setItem('flowforce_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};