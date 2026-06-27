import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TimeUnit, TIME_UNIT_CONVERSIONS } from '../../types';

interface LogTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLog: (minutes: number) => void;
}

const UNITS: TimeUnit[] = ['weeks', 'days', 'hours', 'minutes'];

const LogTimeModal: React.FC<LogTimeModalProps> = ({ isOpen, onClose, onLog }) => {
  const [value, setValue] = useState(1);
  const [unit, setUnit] = useState<TimeUnit>('hours');

  if (!isOpen) return null;

  const handleSubmit = () => {
    const minutes = value * TIME_UNIT_CONVERSIONS[unit];
    if (minutes > 0) {
      onLog(minutes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-80 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Log Time</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(parseInt(e.target.value) || 0)}
            className="w-24 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as TimeUnit)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-700 dark:text-slate-200"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors"
        >
          Log Time
        </button>
      </div>
    </div>
  );
};

export default LogTimeModal;