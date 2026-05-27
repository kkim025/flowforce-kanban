import React from 'react';

interface BoardCardProps {
  id: string;
  title: string;
  status?: 'ACTIVE' | 'ARCHIVED';
  isActive: boolean;
  onClick: () => void;
}

const BoardCard: React.FC<BoardCardProps> = ({ title, isActive, onClick }) => {
  if (isActive) {
    return (
      <div className="px-4 py-3 flex items-center gap-2 opacity-60 cursor-not-allowed">
        <span className="w-2 h-2 rounded-full bg-accent-blue flex-shrink-0" />
        <span className="font-medium truncate">{title}</span>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors text-left"
    >
      <span className="font-medium truncate">{title}</span>
    </button>
  );
};

export default BoardCard;
