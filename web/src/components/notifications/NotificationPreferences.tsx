import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useNotificationActions, useNotificationState } from '../../store/NotificationsContext';
import { NotificationType } from '../../types';

const TYPES: { type: NotificationType; label: string; description: string }[] = [
  { type: 'ASSIGNMENT', label: 'Task assignments', description: 'When someone assigns a task to you.' },
  { type: 'MENTION', label: '@mentions', description: 'When someone @mentions you in a comment.' },
  { type: 'SPRINT_STATUS', label: 'Sprint status changes', description: 'When a sprint on your board is started or archived.' },
  { type: 'DUE_DATE', label: 'Due-date reminders', description: '24h, 1h, and overdue reminders for tasks assigned to you.' },
];

export const NotificationPreferences: React.FC = () => {
  const navigate = useNavigate();
  // Pull only prefs (data) and updatePref (action). The page does not
  // re-render when notifications or unread count change.
  const { prefs } = useNotificationState();
  const { updatePref } = useNotificationActions();

  const isEnabled = (t: NotificationType) => {
    const p = prefs.find((x) => x.type === t);
    return p ? p.inAppEnabled : true; // default is allow
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="p-2 rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition"
          aria-label="Back to board"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-semibold">Notification preferences</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Choose which kinds of in-app notifications you receive. Mutes apply only to this account.
      </p>
      <ul className="divide-y divide-slate-200 dark:divide-slate-700 rounded-lg border border-slate-200 dark:border-slate-700">
        {TYPES.map((row) => {
          const enabled = isEnabled(row.type);
          return (
            <li key={row.type} className="p-4 flex items-start gap-4">
              <div className="flex-1">
                <div className="font-medium">{row.label}</div>
                <div className="text-sm text-slate-500">{row.description}</div>
              </div>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => void updatePref(row.type, e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-10 h-6 bg-slate-300 dark:bg-slate-600 rounded-full peer-checked:bg-indigo-600 transition relative">
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      enabled ? 'translate-x-4' : ''
                    }`}
                  />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
};