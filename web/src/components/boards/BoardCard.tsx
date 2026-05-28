import React from 'react';
import { Trash2, Pencil } from 'lucide-react';

interface BoardCardProps {
  id: string;
  title: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isActive: boolean;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const BoardCard: React.FC<BoardCardProps> = ({ title, isActive, onClick, onEdit, onDelete }) => {
  if (isActive) {
    return (
      <div className="group flex items-center gap-2 w-full px-4 py-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg cursor-default">
        <span className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
        <span className="font-semibold truncate flex-1 text-blue-950 dark:text-blue-400">{title}</span>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            title="Rename board"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 w-full">
      <button
        onClick={onClick}
        className="flex-1 px-4 py-3 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-left text-slate-600 dark:text-slate-300"
      >
        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
        <span className="font-medium truncate">{title}</span>
      </button>
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          title="Rename board"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all text-slate-400 hover:text-red-500"
          title="Delete board"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default BoardCard;
