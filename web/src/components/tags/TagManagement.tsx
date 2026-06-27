import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Trash2, Plus, Edit2, Check, X, AlertCircle } from 'lucide-react';
import { useTags } from '../../store/TagsContext';
import { useKanban } from '../../store/KanbanContext';
import { useToast } from '../../context/ToastContext';
import { Tag } from '../../types';
import { updateTag as apiUpdateTag, deleteTag as apiDeleteTag } from '../../lib/api';

const PRESET_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#94a3b8',
];

function extractErrorMessage(err: unknown, fallback: string): string {
    const e = err as { response?: { data?: { message?: string } }; message?: string };
    return e.response?.data?.message || e.message || fallback;
}

const TagManagement: React.FC = () => {
    const { activeBoardId } = useKanban();
    const { tags, refresh, create } = useTags();
    const { showToast } = useToast();

    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState(PRESET_COLORS[0]);

    useEffect(() => {
        if (activeBoardId && tags.length === 0) {
            refresh(activeBoardId);
        }
    }, [activeBoardId, tags.length, refresh]);

    const handleCreate = useCallback(async () => {
        if (!activeBoardId) return;
        const name = newName.trim().toLowerCase();
        if (!name) return;
        if (name.length > 32) {
            showToast('Tag name must be 32 characters or fewer', 'error');
            return;
        }
        setIsCreating(true);
        try {
            await create({ boardId: activeBoardId, name, color: newColor });
            setNewName('');
            setNewColor(PRESET_COLORS[0]);
            showToast(`Tag "${name}" created`, 'success');
        } catch (err: unknown) {
            showToast(extractErrorMessage(err, 'Failed to create tag'), 'error');
        } finally {
            setIsCreating(false);
        }
    }, [activeBoardId, newName, newColor, create, showToast]);

    const handleStartEdit = (tag: Tag) => {
        setEditingId(tag.id);
        setEditName(tag.name);
        setEditColor(tag.color);
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        const name = editName.trim().toLowerCase();
        if (!name) return;
        try {
            await apiUpdateTag(editingId, { name, color: editColor });
            showToast(`Tag renamed to "${name}"`, 'success');
            setEditingId(null);
        } catch (err: unknown) {
            showToast(extractErrorMessage(err, 'Failed to update tag'), 'error');
        }
    };

    const handleDelete = async (tag: Tag) => {
        if (!window.confirm(`Delete tag "${tag.name}"? It will be removed from all tasks.`)) return;
        try {
            await apiDeleteTag(tag.id);
            showToast(`Tag "${tag.name}" deleted`, 'success');
        } catch (err: unknown) {
            showToast(extractErrorMessage(err, 'Failed to delete tag'), 'error');
        }
    };

    if (!activeBoardId) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-8 h-8 text-amber-500 mb-4" />
                <h2 className="text-lg font-bold mb-2">No active board</h2>
                <p className="text-sm text-slate-400">Select a board to manage its tag library.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8">
            <header className="space-y-1">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <TagIcon className="w-6 h-6 text-accent-blue" />
                    Tag Library
                </h1>
                <p className="text-sm text-slate-500">
                    Manage the named tags available to tasks on this board. Tag names are
                    case-insensitive and unique within a board.
                </p>
            </header>

            <section className="glass rounded-2xl p-4 border border-white/20 space-y-3">
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    New tag
                </h2>
                <div className="flex flex-wrap gap-3 items-center">
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreate();
                        }}
                        placeholder="Tag name"
                        maxLength={32}
                        className="flex-1 min-w-[160px] bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-accent-blue"
                    />
                    <div className="flex items-center gap-1.5">
                        {PRESET_COLORS.map((c) => (
                            <button
                                key={c}
                                type="button"
                                aria-label={`Choose color ${c}`}
                                onClick={() => setNewColor(c)}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${
                                    newColor === c
                                        ? 'border-slate-900 dark:border-white scale-110'
                                        : 'border-transparent'
                                }`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={handleCreate}
                        disabled={isCreating || !newName.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-accent-blue text-white rounded-lg font-bold text-xs uppercase tracking-widest disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-blue/90 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Create
                    </button>
                </div>
            </section>

            <section className="glass rounded-2xl border border-white/20 overflow-hidden">
                <header className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Library ({tags.length})
                    </h2>
                </header>
                {tags.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400 italic">
                        No tags yet. Create one above to populate the library.
                    </div>
                ) : (
                    <ul className="divide-y divide-white/5">
                        {tags.map((tag) => (
                            <li
                                key={tag.id}
                                className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
                            >
                                <span
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: tag.color }}
                                />
                                {editingId === tag.id ? (
                                    <>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            maxLength={32}
                                            className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                            autoFocus
                                        />
                                        <div className="flex items-center gap-1">
                                            {PRESET_COLORS.map((c) => (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    aria-label={`Choose color ${c}`}
                                                    onClick={() => setEditColor(c)}
                                                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                                                        editColor === c
                                                            ? 'border-slate-900 dark:border-white scale-110'
                                                            : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                            aria-label="Save"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditingId(null)}
                                            className="p-1.5 text-slate-400 hover:bg-slate-500/10 rounded-lg transition-colors"
                                            aria-label="Cancel"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                            {tag.name}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                                            {tag.color}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleStartEdit(tag)}
                                            className="p-1.5 text-slate-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors"
                                            aria-label={`Edit ${tag.name}`}
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(tag)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            aria-label={`Delete ${tag.name}`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
};

export default TagManagement;