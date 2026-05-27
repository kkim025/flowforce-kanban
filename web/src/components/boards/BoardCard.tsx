import React from 'react';
import { Trash2 } from 'lucide-react';

interface BoardCardProps {
  id: string;
  title: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isActive: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

const BoardCard: React.FC<BoardCardProps> = ({ title, isActive, onClick, onDelete }) => {
  if (isActive) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 opacity-60 cursor-not-allowed">
        <span className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
        <span className="font-medium truncate flex-1">{title}</span>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-2 w-full">
      <button
        onClick={onClick}
        className="flex-1 px-4 py-3 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
      >
        <span className="font-medium truncate">{title}</span>
      </button>
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
