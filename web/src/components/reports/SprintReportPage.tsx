import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useKanban } from '../../store/KanbanContext';
import SprintReport from './SprintReport';
import { Sprint } from '../../types';

const SprintReportPage: React.FC = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const { state } = useKanban();
  const navigate = useNavigate();

  useEffect(() => {
    if (!boardId) {
      navigate('/');
    }
  }, [boardId, navigate]);

  if (!boardId) return null;

  const sprints = state.sprints.filter((s: Sprint) => s.boardId === boardId);

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      >
        ← Back to Board
      </button>
      <SprintReport boardId={boardId} sprints={sprints} />
    </div>
  );
};

export default SprintReportPage;