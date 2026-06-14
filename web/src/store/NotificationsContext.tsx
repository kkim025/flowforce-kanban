import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, resetSocket } from '../lib/socket';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  getNotificationPrefs,
  upsertNotificationPref,
} from '../lib/api';
import { AppNotification, NotificationType, UserNotificationPref } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from '../context/ToastContext';

// Server emits a 'notification' event for every push. Kept as a module-level
// const so the on/off registrations and any future event-filter code can
// reference one source of truth.
const NOTIFICATION_EVENT = 'notification';

const MAX_KEEP = 100;
const POLL_INTERVAL_MS = 30_000;

interface NotificationsState {
  notifications: AppNotification[];
  unreadCount: number;
  prefs: UserNotificationPref[];
  isConnected: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface NotificationsActions {
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  updatePref: (type: NotificationType, inAppEnabled: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
}

const NotificationsStateContext = createContext<NotificationsState | undefined>(undefined);
const NotificationsActionsContext = createContext<NotificationsActions | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<UserNotificationPref[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Mirror of the latest state. Read synchronously inside stable callbacks
  // (no closure deps, no StrictMode double-invoke hazard). The ref is synced
  // in an effect — writing to ref.current during render is flagged by the
  // react-hooks/refs rule and breaks concurrent rendering.
  const stateRef = useRef({ notifications, unreadCount });
  useEffect(() => {
    stateRef.current = { notifications, unreadCount };
  }, [notifications, unreadCount]);

  // Hoisted: only uses stable setters, the cursorRef, and module-level API
  // imports, so it's safe to call from the auth-state effect without a
  // stale-closure risk.
  const loadInitial = useCallback(async () => {
    try {
      const [{ items, nextCursor }, count, serverPrefs] = await Promise.all([
        getNotifications({ limit: 20 }),
        getUnreadCount(),
        getNotificationPrefs().catch(() => [] as UserNotificationPref[]),
      ]);
      setNotifications(items);
      setUnreadCount(count);
      setPrefs(serverPrefs);
      setHasMore(nextCursor !== null);
      cursorRef.current = nextCursor;
    } catch (err) {
      console.error('notifications init failed', err);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const count = await getUnreadCount();
        // Bail out via functional setter so unchanged counts do not trigger
        // a re-render of every useNotifications consumer every 30 s.
        setUnreadCount((prev) => (prev === count ? prev : count));
      } catch {
        // ignore; the next tick will retry
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // Open or close the socket in lockstep with the auth state.
  useEffect(() => {
    if (!isAuthenticated || !token) {
      // Tear down on logout / token refresh.
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      resetSocket();
      setIsConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      setPrefs([]);
      return;
    }

    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setIsConnected(true);
      // Stop the polling fallback (if a prior disconnect started it) and
      // refetch so the cache converges with the server.
      stopPolling();
      void loadInitial();
    };
    const onDisconnect = () => {
      setIsConnected(false);
      startPolling();
    };
    const onNotification = (n: AppNotification) => {
      setNotifications((prev) => {
        const deduped = prev.filter((p) => p.id !== n.id);
        return [n, ...deduped].slice(0, MAX_KEEP);
      });
      if (!n.readAt) setUnreadCount((c) => c + 1);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(NOTIFICATION_EVENT, onNotification);
    socket.connect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(NOTIFICATION_EVENT, onNotification);
      stopPolling();
    };
  }, [isAuthenticated, token, loadInitial, startPolling, stopPolling]);

  const markAsRead = useCallback(async (id: string) => {
    // Snapshot synchronously from the ref so the optimistic update and
    // rollback are stable under StrictMode (where functional setters are
    // invoked twice).
    const target = stateRef.current.notifications.find((n) => n.id === id);
    if (!target) return;
    const wasUnread = !target.readAt;

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    if (wasUnread) {
      // Functional setter: survives concurrent markAsRead calls so two rapid
      // decrements compose correctly, and the matching rollback (c + 1)
      // composes with any third concurrent mark.
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('markNotificationRead failed, rolling back', err);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: target.readAt ?? null } : n)),
      );
      if (wasUnread) {
        setUnreadCount((c) => c + 1);
      }
      showToast('Could not mark notification as read. Please try again.', 'error');
    }
  }, [showToast]);

  const markAllAsRead = useCallback(async () => {
    const before = Date.now();
    setNotifications((prev) =>
      prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date(before).toISOString() })),
    );
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('markAllNotificationsRead failed', err);
      showToast('Could not mark all as read. Please try again.', 'error');
    }
  }, [showToast]);

  const updatePref = useCallback(async (type: NotificationType, inAppEnabled: boolean) => {
    const tempId = `tmp-${crypto.randomUUID()}`;
    setPrefs((prev) => {
      const existing = prev.find((p) => p.type === type);
      if (existing) return prev.map((p) => (p.type === type ? { ...p, inAppEnabled } : p));
      // userId is server-assigned; the saved response replaces this row.
      return [...prev, { id: tempId, userId: '', type, inAppEnabled }];
    });
    try {
      const saved = await upsertNotificationPref(type, inAppEnabled);
      setPrefs((prev) => prev.map((p) => (p.type === type ? saved : p)));
    } catch (err) {
      console.error('upsertNotificationPref failed', err);
      showToast('Could not save notification preference. Please try again.', 'error');
    }
  }, [showToast]);

  const loadMore = useCallback(async () => {
    // Guard against rapid double-clicks: capture the cursor at entry, then
    // mark in-flight. The functional setter means concurrent calls bail.
    const cursor = cursorRef.current;
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      const { items, nextCursor } = await getNotifications({ limit: 20, cursor });
      setNotifications((prev) => [...prev, ...items].slice(0, MAX_KEEP));
      cursorRef.current = nextCursor;
      setHasMore(nextCursor !== null);
    } catch (err) {
      console.error('loadMore failed', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, []);

  const stateValue = useMemo<NotificationsState>(
    () => ({ notifications, unreadCount, prefs, isConnected, hasMore, isLoadingMore }),
    [notifications, unreadCount, prefs, isConnected, hasMore, isLoadingMore],
  );

  // Actions context value is stable — every callback is useCallbackd with
  // a stable dep set (or deps that are themselves stable: showToast, the
  // module-level API imports, the cursor ref). Consumers that only need
  // data (the bell) re-render on data change, not on action identity churn.
  const actionsValue = useMemo<NotificationsActions>(
    () => ({ markAsRead, markAllAsRead, updatePref, loadMore }),
    [markAsRead, markAllAsRead, updatePref, loadMore],
  );

  return (
    <NotificationsStateContext.Provider value={stateValue}>
      <NotificationsActionsContext.Provider value={actionsValue}>
        {children}
      </NotificationsActionsContext.Provider>
    </NotificationsStateContext.Provider>
  );
};

/** Subscribes to notification data only. Re-renders on data change. */
export const useNotificationState = (): NotificationsState => {
  const ctx = useContext(NotificationsStateContext);
  if (!ctx) throw new Error('useNotificationState must be used within a NotificationsProvider');
  return ctx;
};

/** Subscribes to the stable callbacks only. Does NOT re-render on data change. */
export const useNotificationActions = (): NotificationsActions => {
  const ctx = useContext(NotificationsActionsContext);
  if (!ctx) throw new Error('useNotificationActions must be used within a NotificationsProvider');
  return ctx;
};

/**
 * Convenience: full state + actions. Use only when a component genuinely
 * needs both. For the common "display + click handler" case, prefer
 * pulling each from its own hook to avoid the bell re-rendering on every
 * socket push.
 */
export const useNotifications = (): NotificationsState & NotificationsActions => {
  const state = useNotificationState();
  const actions = useNotificationActions();
  return { ...state, ...actions };
};