import React, { useState, useEffect } from 'react';
import { Clock, Trash2, Plus } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { getTimeEntries, deleteTimeEntry as apiDeleteTimeEntry, logTime as apiLogTime } from '../../lib/api';
import LogTimeModal from './LogTimeModal';

interface TimeTabProps {
  taskId: string;
  estimatedMinutes: number | null;
  onUpdateEstimate: (minutes: number | null) => void;
  userId: string;
}

interface TimeEntryData {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  minutes: number;
  date: string;
  createdAt: string;
}

const TimeTab: React.FC<TimeTabProps> = ({ taskId, estimatedMinutes, onUpdateEstimate, userId }) => {
  const [entries, setEntries] = useState<TimeEntryData[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [taskId]);

  const loadEntries = async () => {
    try {
      const data = await getTimeEntries(taskId);
      setEntries(data);
    } catch (error) {
      console.error('Failed to load time entries:', error);
    }
  };

  const handleLogTime = async (minutes: number) => {
    try {
      await apiLogTime(taskId, minutes);
      await loadEntries();
    } catch (error) {
      console.error('Failed to log time:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteTimeEntry(id);
      await loadEntries();
    } catch (error) {
      console.error('Failed to delete time entry:', error);
    }
  };

  const totalLogged = entries.reduce((sum, e) => sum + e.minutes, 0);
  const variance = estimatedMinutes != null ? totalLogged - estimatedMinutes : null;

  return (
    <div className="space-y-4">
      {/* Estimated */}
      <div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Estimated</h3>
        <input
          type="number"
          placeholder="Minutes"
          value={estimatedMinutes ?? ''}
          onChange={(e) => onUpdateEstimate(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-200"
        />
      </div>

      {/* Summary */}
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Logged</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{formatTime(totalLogged)}</span>
        </div>
        {variance !== null && (
          <div className="flex justify-between text-xs mt-1">
            <span className="text-slate-500">Variance</span>
            <span className={`font-bold ${variance < 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {variance < 0 ? '' : '+'}
              {formatTime(Math.abs(variance))}
            </span>
          </div>
        )}
      </div>

      {/* Log Button */}
      <button
        onClick={() => setShowLogModal(true)}
        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
      >
        <Plus className="w-3 h-3" />
        Log Time
      </button>

      {/* Entries List */}
      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
            >
              <div>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {formatTime(entry.minutes)}
                </span>
                <span className="text-slate-400 ml-2">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
                {entry.userName && <span className="text-slate-400 ml-1">· {entry.userName}</span>}
              </div>
              {entry.userId === userId && (
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-slate-400 hover:text-red-500"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <LogTimeModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        onLog={handleLogTime}
      />
    </div>
  );
};

export default TimeTab;