import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Undo2, Trash2, ArrowLeft, ChevronRight } from 'lucide-react';
import {
    WikiTrashItem,
    WikiPage,
} from '../../types/wiki';
import {
    getWikiTrash,
    restoreWikiPage,
    hardDeleteWikiPage,
} from '../../lib/wiki';
import { useToast } from '../../hooks/useToast';
import { UI_LABELS } from '../../lib/constants';

interface WikiTrashProps {
    boardId: string;
}

const WikiTrash: React.FC<WikiTrashProps> = ({ boardId }) => {
    const [items, setItems] = useState<WikiTrashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmingDelete, setConfirmingDelete] = useState<WikiPage | null>(
        null,
    );
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const t = await getWikiTrash(boardId);
            setItems(t);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Failed to load trash',
                'error',
            );
        } finally {
            setLoading(false);
        }
    }, [boardId, showToast]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRestore = async (pageId: string) => {
        try {
            await restoreWikiPage(boardId, pageId);
            showToast('Page restored', 'success');
            load();
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Restore failed',
                'error',
            );
        }
    };

    const handleHardDelete = async (page: WikiPage) => {
        setDeleting(true);
        try {
            await hardDeleteWikiPage(boardId, page.id);
            showToast('Page deleted forever', 'success');
            setConfirmingDelete(null);
            setConfirmText('');
            load();
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Delete failed',
                'error',
            );
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Loading…
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => navigate(`/boards/${boardId}/wiki`)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-blue"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        {UI_LABELS.WIKI}
                    </button>
                    <ChevronRight className="w-3 h-3 text-slate-300" />
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                        {UI_LABELS.WIKI_TRASH}
                    </h1>
                </div>

                {items.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">
                        Trash is empty.
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {items.map(({ page, breadcrumb }) => (
                            <li
                                key={page.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40"
                                data-testid="wiki-trash-item"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                                        {page.title}
                                    </p>
                                    {breadcrumb && breadcrumb.length > 0 && (
                                        <p className="text-[10px] text-slate-400 truncate">
                                            {breadcrumb
                                                .map((b) => b.title)
                                                .join(' / ')}
                                        </p>
                                    )}
                                    {page.archivedAt && (
                                        <p className="text-[10px] text-slate-400">
                                            Archived{' '}
                                            {new Date(
                                                page.archivedAt,
                                            ).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleRestore(page.id)}
                                        className="p-2 rounded-lg text-slate-500 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-slate-800"
                                        title={UI_LABELS.WIKI_RESTORE}
                                        aria-label={UI_LABELS.WIKI_RESTORE}
                                    >
                                        <Undo2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfirmingDelete(page)
                                        }
                                        className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title={UI_LABELS.WIKI_DELETE_FOREVER}
                                        aria-label={
                                            UI_LABELS.WIKI_DELETE_FOREVER
                                        }
                                        data-testid="wiki-trash-delete-forever"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {confirmingDelete && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 flex items-center justify-center p-4"
                    onClick={() => {
                        setConfirmingDelete(null);
                        setConfirmText('');
                    }}
                >
                    <div
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {UI_LABELS.WIKI_DELETE_FOREVER}
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            {UI_LABELS.WIKI_CONFIRM_DELETE_TITLE}
                            :
                            <br />
                            <code className="font-mono text-slate-700 dark:text-slate-300">
                                {confirmingDelete.title}
                            </code>
                        </p>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={confirmingDelete.title}
                            className="w-full px-3 py-2 mb-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-red-500/30"
                            data-testid="wiki-trash-confirm-input"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setConfirmingDelete(null);
                                    setConfirmText('');
                                }}
                                disabled={deleting}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                {UI_LABELS.CANCEL}
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    handleHardDelete(confirmingDelete)
                                }
                                disabled={
                                    deleting ||
                                    confirmText !== confirmingDelete.title
                                }
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500 text-white shadow hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                                data-testid="wiki-trash-confirm-button"
                            >
                                {deleting ? '...' : UI_LABELS.DELETE}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WikiTrash;
