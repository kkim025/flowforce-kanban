import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotificationActions, useNotificationState } from '../../store/NotificationsContext';
import { AppNotification } from '../../types';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
] as const;

type Tab = typeof TABS[number]['key'];

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  // Pull only the data this page renders + the actions it needs. Subscribing
  // to the actions context (rather than the merged `useNotifications`) keeps
  // the page from re-rendering when an unrelated data field changes.
  const { notifications, hasMore, isLoadingMore } = useNotificationState();
  const { loadMore, markAsRead, markAllAsRead } = useNotificationActions();
  const [tab, setTab] = useState<Tab>('all');

  // Initial load is handled by NotificationsContext on auth state change.
  // useMemo avoids re-filtering on every parent re-render.
  const visible = useMemo(
    () => (tab === 'unread' ? notifications.filter((n) => !n.readAt) : notifications),
    [tab, notifications],
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
          aria-label="Back to board"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Notifications</h1>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void markAllAsRead()}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
        >
          Mark all as read
        </button>
      </div>
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-1 rounded-full text-sm ${
              tab === t.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400 text-sm">No notifications.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700">
          {visible.map((n) => (
            <Row key={n.id} n={n} onMarkRead={markAsRead} />
          ))}
        </ul>
      )}
      {hasMore && tab === 'all' && (
        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={isLoadingMore}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ n: AppNotification; onMarkRead: (id: string) => Promise<void> }> = ({ n, onMarkRead }) => (
  <li
    className={`p-4 flex items-start gap-3 ${
      n.readAt ? '' : 'bg-indigo-50/40 dark:bg-indigo-900/20'
    }`}
  >
    <div className="flex-1">
      <div className="font-medium text-slate-900 dark:text-slate-100">{n.title}</div>
      {n.body && <div className="text-sm text-slate-500 dark:text-slate-400">{n.body}</div>}
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleString()}</div>
    </div>
    {!n.readAt && (
      <button
        type="button"
        onClick={() => void onMarkRead(n.id)}
        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
      >
        Mark read
      </button>
    )}
  </li>
);