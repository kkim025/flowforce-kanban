import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import api from '../../lib/api';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (board: { id: string; title: string; status?: string }) => void;
}

const CreateBoardModal: React.FC<CreateBoardModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    try {
      const response = await api.post('/boards', { title: title.trim() });
      onCreated(response.data);
      onClose();
    } catch (err) {
      console.error('Failed to create board:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1150] flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-950 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-white/10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>

        <h2 className="text-lg font-black mb-4">Create New Board</h2>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Board name"
          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl font-bold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
            className="flex-1 px-4 py-3 bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors"
          >
            {isCreating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateBoardModal;
