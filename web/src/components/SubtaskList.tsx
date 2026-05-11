import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useKanban } from '../store/KanbanContext';
import { createSubtask, updateSubtask, deleteSubtask, reorderSubtasks } from '../lib/api';
import { SubTask, Priority } from '../types';

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

interface SubtaskItemProps {
  subtask: SubTask & { _checklistId: string };
  taskPriority: Priority;
  taskId: string;
  index: number;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, taskPriority, taskId, index }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(subtask.title);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { dispatch } = useKanban();

  const displayPriority = subtask.priority || taskPriority;

  const handleToggle = async () => {
    try {
      const updated = await updateSubtask(subtask.id, { completed: !subtask.isCompleted });
      dispatch({ type: 'UPDATE_SUBTASK', payload: { taskId, subtask: { ...subtask, ...updated, isCompleted: updated.completed } } });
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === subtask.title) {
      setIsEditing(false);
      return;
    }
    try {
      const updated = await updateSubtask(subtask.id, { content: editContent.trim() });
      dispatch({ type: 'UPDATE_SUBTASK', payload: { taskId, subtask: { ...subtask, title: updated.content } } });
      setIsEditing(false);
    } catch (err) {
      console.error('Edit failed', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSubtask(subtask.id);
      dispatch({ type: 'DELETE_SUBTASK', payload: { taskId, checklistId: subtask.checklistId || subtask._checklistId, subtaskId: subtask.id } });
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <>
      <Draggable draggableId={subtask.id} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="group flex items-center gap-2 py-2 px-1 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded transition-colors"
          >
            {/* Drag handle */}
            <span {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab">⋮⋮</span>

            {/* Checkbox */}
            <input
              type="checkbox"
              checked={subtask.isCompleted}
              onChange={handleToggle}
              className="w-4 h-4 rounded border-slate-300 text-accent-blue focus:ring-accent-blue"
            />

            {/* Content */}
            {isEditing ? (
              <input
                autoFocus
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setIsEditing(false); }}
                onBlur={handleSaveEdit}
                className="flex-1 text-sm border border-accent-blue rounded px-2 py-0.5 focus:outline-none"
              />
            ) : (
              <span className={`flex-1 text-sm ${subtask.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {subtask.title}
              </span>
            )}

            {/* Priority badge */}
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_BADGE[displayPriority]}`}>
              {displayPriority.toUpperCase()}
            </span>

            {/* Edit / Delete icons (shown on hover) */}
            {isEditing ? (
              <>
                <button onClick={handleSaveEdit} className="text-accent-blue text-xs">✓</button>
                <button onClick={() => { setIsEditing(false); setEditContent(subtask.title); }} className="text-slate-400 text-xs">✕</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-500 text-xs transition-opacity">✏️</button>
                <button onClick={() => setShowDeleteModal(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs transition-opacity">🗑</button>
              </>
            )}
          </div>
        )}
      </Draggable>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-72 shadow-2xl">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete Subtask?</h3>
            <p className="text-sm text-slate-500 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface SubtaskListProps {
  task: any;  // Task type from ../types
}

const SubtaskList: React.FC<SubtaskListProps> = ({ task }) => {
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState<Priority | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const { dispatch } = useKanban();

  // Flatten all subtasks across all checklists, keep checklistId on each
  const allSubtasks: (SubTask & { _checklistId: string })[] = [];
  task.checklists?.forEach((cl: any) => {
    cl.items?.forEach((item: SubTask) => {
      allSubtasks.push({ ...item, _checklistId: cl.id });
    });
  });

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return;
    const reordered = Array.from(allSubtasks);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);

    // Update local state optimistically
    const checklistId = moved._checklistId;
    dispatch({
      type: 'REORDER_SUBTASKS',
      payload: {
        taskId: task.id,
        checklistId,
        orderedSubtasks: reordered.filter(s => s._checklistId === checklistId),
      },
    });

    // Persist
    try {
      await reorderSubtasks(checklistId, reordered.filter(s => s._checklistId === checklistId).map(s => s.id));
    } catch (err) {
      console.error('Reorder failed', err);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    const firstChecklist = task.checklists?.[0];
    if (!firstChecklist) return;

    try {
      const created = await createSubtask({ content: newContent.trim(), checklistId: firstChecklist.id, priority: newPriority });
      dispatch({ type: 'ADD_SUBTASK', payload: { taskId: task.id, checklistId: firstChecklist.id, subtask: created } });
      setNewContent('');
      setNewPriority(undefined);
      setIsAdding(false);
    } catch (err) {
      console.error('Add subtask failed', err);
    }
  };

  if (!task.checklists?.length) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Subtasks</h4>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`task-${task.id}`}>
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {allSubtasks.map((subtask, index) => (
                <SubtaskItem
                  key={subtask.id}
                  subtask={subtask}
                  taskPriority={task.priority}
                  taskId={task.id}
                  index={index}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Add subtask inline */}
      {isAdding ? (
        <form onSubmit={handleAdd} className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Subtask content..."
            className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          />
          <select
            value={newPriority || ''}
            onChange={e => setNewPriority(e.target.value as Priority || undefined)}
            className="text-xs border border-slate-200 dark:border-slate-600 rounded px-1 py-1 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
          >
            <option value="">Inherit</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="px-2 py-1 text-xs bg-accent-blue text-white rounded">Add</button>
          <button type="button" onClick={() => setIsAdding(false)} className="text-xs text-slate-400">Cancel</button>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-2 text-xs text-slate-400 hover:text-accent-blue flex items-center gap-1"
        >
          + Add subtask
        </button>
      )}
    </div>
  );
};

export default SubtaskList;