import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useNotificationActions, useNotificationState } from '../../store/NotificationsContext';
import { AppNotification, NotificationRefType } from '../../types';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

// Exhaustive Record so adding a third NotificationRefType is a compile error.
const buildHref: Record<NotificationRefType, (n: AppNotification) => string> = {
  task: (n) => `/tasks/${n.refId}`,
  sprint: (n) => `/board/${n.boardId ?? ''}`,
};

export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications } = useNotificationState();
  const { markAsRead, markAllAsRead } = useNotificationActions();
  // useMemo: the dropdown is rendered frequently (on every bell click) and
  // the slice is O(8) on a list of up to 100 — minor, but matches the
  // center-page treatment.
  const recent = useMemo(() => notifications.slice(0, 8), [notifications]);

  return (
    <div
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 mt-2 w-96 max-h-[28rem] overflow-y-auto rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</span>
        <button
          type="button"
          onClick={() => void markAllAsRead()}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
        >
          Mark all as read
        </button>
      </div>
      {recent.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
          {recent.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer ${
                n.readAt ? '' : 'bg-indigo-50/40 dark:bg-indigo-900/20'
              }`}
              onClick={() => {
                if (!n.readAt) void markAsRead(n.id);
              }}
            >
              <Link to={buildHref[n.refType](n)} onClick={onClose} className="block">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</div>
                {n.body && <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-slate-400 mt-1">{formatRelative(n.createdAt)}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-center">
        <Link to="/notifications" onClick={onClose} className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
          See all
        </Link>
      </div>
    </div>
  );
};