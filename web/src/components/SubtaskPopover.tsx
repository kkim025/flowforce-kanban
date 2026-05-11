import React, { useState, useRef, useEffect } from 'react';
import { createSubtask } from '../lib/api';
import { useKanban } from '../store/KanbanContext';

interface SubtaskPopoverProps {
  taskId: string;
  checklists: { id: string; title: string }[];
  onClose: () => void;
  onAdded: () => void;
}

const SubtaskPopover: React.FC<SubtaskPopoverProps> = ({ taskId, checklists, onClose, onAdded }) => {
  const [content, setContent] = useState('');
  const [checklistId, setChecklistId] = useState(checklists[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { dispatch } = useKanban();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !checklistId) return;
    setIsSubmitting(true);
    try {
      const newSubtask = await createSubtask({ content: content.trim(), checklistId });
      dispatch({ type: 'ADD_SUBTASK', payload: { taskId, checklistId, subtask: newSubtask } });
      onAdded();
      onClose();
    } catch (err) {
      console.error('Failed to create subtask', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-50">
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          ref={inputRef}
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Subtask content..."
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue"
        />
        <select
          value={checklistId}
          onChange={e => setChecklistId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
        >
          {checklists.map(cl => (
            <option key={cl.id} value={cl.id}>{cl.title}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>
    </div>
  );
};

export default SubtaskPopover;