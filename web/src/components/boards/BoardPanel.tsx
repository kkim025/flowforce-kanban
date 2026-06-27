import React, { useState, useMemo, useRef, useEffect } from 'react';
import BoardCard from './BoardCard';
import CreateBoardModal from './CreateBoardModal';
import ConfirmationModal from '../ConfirmationModal';
import { X, Layout } from 'lucide-react';
import api from '../../lib/api';

interface Board {
  id: string;
  title: string;
  status?: 'ACTIVE' | 'ARCHIVED';
}

interface BoardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeBoardId: string | null;
  allBoards: Board[];
  onSwitchBoard: (boardId: string) => void;
  onBoardCreated: (board: Board) => void;
  onBoardDeleted: (boardId: string) => void;
  onBoardRenamed: (boardId: string, title: string) => void;
  /** Called when a board operation (delete/rename) fails so the parent can show a toast */
  onError?: (message: string) => void;
}

const BoardPanel: React.FC<BoardPanelProps> = ({
  isOpen,
  onClose,
  activeBoardId,
  allBoards,
  onSwitchBoard,
  onBoardCreated,
  onBoardDeleted,
  onBoardRenamed,
  onError,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState<Board | null>(null);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingBoard && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingBoard]);

  const { activeBoards, archivedBoards } = useMemo(() => {
    return {
      activeBoards: allBoards.filter(b => b.status !== 'ARCHIVED'),
      archivedBoards: allBoards.filter(b => b.status === 'ARCHIVED'),
    };
  }, [allBoards]);

  const handleDeleteBoard = async () => {
    if (!deletingBoard) return;
    setDeleteError(null);
    try {
      await api.delete(`/boards/${deletingBoard.id}`);
      onBoardDeleted(deletingBoard.id);
      setDeletingBoard(null);
    } catch (err) {
      console.error('Failed to delete board:', err);
      setDeleteError('Failed to delete board. Please try again.');
      onError?.('Failed to delete board. Please try again.');
    }
  };

  const handleStartEdit = (board: Board) => {
    setEditingBoard(board);
    setEditingTitle(board.title);
  };

  const handleSaveEdit = () => {
    if (!editingBoard) return;
    const trimmedTitle = editingTitle.trim();
    if (trimmedTitle && trimmedTitle !== editingBoard.title) {
      onBoardRenamed(editingBoard.id, trimmedTitle);
    }
    setEditingBoard(null);
    setEditingTitle('');
  };

  const handleCancelEdit = () => {
    setEditingBoard(null);
    setEditingTitle('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] z-[1140] transition-colors"
        onClick={onClose}
      />

      <div className="fixed left-0 top-0 h-full w-full md:w-96 bg-white dark:bg-slate-950 shadow-2xl z-[1141] flex flex-col border-r border-slate-200 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-xl">
              <Layout className="w-5 h-5 text-accent-blue" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              My Boards
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {/* Create button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full mb-4 px-4 py-3 bg-accent-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Board
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-sm text-slate-500 cursor-pointer hover:text-slate-700">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-slate-300"
            />
            Show archived
          </label>

          {/* Current section */}
          {activeBoards.length > 0 && (
            <div className="mb-6">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-4">
                Current
              </div>
              <div className="space-y-1">
                {activeBoards.map((board) => (
                  editingBoard?.id === board.id ? (
                    <div key={board.id} className="px-4 py-3 flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        className="flex-1 px-3 py-2 border border-accent-blue rounded-lg text-sm font-medium bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-accent-blue/50"
                      />
                    </div>
                  ) : (
                    <BoardCard
                      key={board.id}
                      id={board.id}
                      title={board.title}
                      status={board.status}
                      isActive={board.id === activeBoardId}
                      onClick={() => {
                        if (board.id !== activeBoardId) {
                          onSwitchBoard(board.id);
                        }
                      }}
                      onEdit={() => handleStartEdit(board)}
                      onDelete={board.id !== activeBoardId ? () => setDeletingBoard(board) : undefined}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {/* Archived section */}
          {archivedBoards.length > 0 && showArchived && (
            <div className="mb-6">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-4">
                Archived
              </div>
              <div className="space-y-1">
                {archivedBoards.map((board) => (
                  editingBoard?.id === board.id ? (
                    <div key={board.id} className="px-4 py-3 flex items-center gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                        onBlur={handleSaveEdit}
                        className="flex-1 px-3 py-2 border border-accent-blue rounded-lg text-sm font-medium bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-accent-blue/50"
                      />
                    </div>
                  ) : (
                    <BoardCard
                      key={board.id}
                      id={board.id}
                      title={board.title}
                      status={board.status}
                      isActive={false}
                      onClick={() => {
                        onSwitchBoard(board.id);
                      }}
                      onEdit={() => handleStartEdit(board)}
                      onDelete={() => setDeletingBoard(board)}
                    />
                  )
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {allBoards.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Layout className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No boards yet</p>
            </div>
          )}
        </div>
      </div>

      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={(board) => {
          onBoardCreated(board as Board);
        }}
      />

      <ConfirmationModal
        isOpen={!!deletingBoard}
        title="Delete Board"
        message={deleteError || `Delete board "${deletingBoard?.title}"? This will permanently delete all columns and tasks in this board. This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteBoard}
        onCancel={() => { setDeletingBoard(null); setDeleteError(null); }}
      />
    </>
  );
};

export default BoardPanel;
