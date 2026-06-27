import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import {
    Edit3,
    History,
    Trash2,
    ArrowLeft,
    Clock,
} from 'lucide-react';
import {
    WikiPage,
    WikiVersion,
    WIKI_VERSION_OPTIONS,
    WIKI_VERSION_PAGE_SIZE,
} from '../../types/wiki';
import {
    archiveWikiPage,
    listWikiVersions,
    restoreWikiVersion,
} from '../../lib/wiki';
import { useToast } from '../../hooks/useToast';
import { UI_LABELS } from '../../lib/constants';
import ConfirmationModal from '../ConfirmationModal';

interface WikiPageViewProps {
    boardId: string;
    pageId: string;
    onEdit: () => void;
    onDeleted: () => void;
}

const WikiPageView: React.FC<WikiPageViewProps> = ({
    boardId,
    pageId,
    onEdit,
    onDeleted,
}) => {
    const [page, setPage] = useState<WikiPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [showHistory, setShowHistory] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [versions, setVersions] = useState<WikiVersion[]>([]);
    const [historyLimit, setHistoryLimit] = useState<number>(
        WIKI_VERSION_PAGE_SIZE,
    );
    const [versionsLoading, setVersionsLoading] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    // Load page
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        import('../../lib/wiki').then(({ getWikiPage }) => {
            getWikiPage(boardId, pageId)
                .then((p) => {
                    if (!cancelled) setPage(p);
                })
                .catch((err: unknown) => {
                    if (!cancelled) {
                        showToast(
                            err instanceof Error
                                ? err.message
                                : 'Failed to load page',
                            'error',
                        );
                    }
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        });
        return () => {
            cancelled = true;
        };
    }, [boardId, pageId, showToast]);

    const loadVersions = useCallback(
        async (limit: number) => {
            setVersionsLoading(true);
            try {
                const v = await listWikiVersions(boardId, pageId, limit);
                setVersions(v);
            } catch (err) {
                showToast(
                    err instanceof Error
                        ? err.message
                        : 'Failed to load versions',
                    'error',
                );
            } finally {
                setVersionsLoading(false);
            }
        },
        [boardId, pageId, showToast],
    );

    useEffect(() => {
        if (showHistory) loadVersions(historyLimit);
    }, [showHistory, historyLimit, loadVersions]);

    const handleArchive = async () => {
        if (!page) return;
        setShowArchiveConfirm(true);
    };

    const confirmArchive = async () => {
        if (!page) return;
        setShowArchiveConfirm(false);
        try {
            await archiveWikiPage(boardId, pageId);
            showToast('Page archived', 'success');
            onDeleted();
            navigate(`/boards/${boardId}/wiki`);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Archive failed',
                'error',
            );
        }
    };

    const handleRestoreVersion = async (versionId: string) => {
        try {
            const updated = await restoreWikiVersion(
                boardId,
                pageId,
                versionId,
            );
            setPage(updated);
            setShowHistory(false);
            showToast('Version restored', 'success');
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Restore failed',
                'error',
            );
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Loading…
            </div>
        );
    }
    if (!page) {
        return (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                {UI_LABELS.TASK_NOT_FOUND}
            </div>
        );
    }

    const updatedAt = new Date(page.updatedAt);
    const updatedLabel = `${UI_LABELS.WIKI_LAST_EDITED} ${updatedAt.toLocaleString()}`;

    return (
        // Full-width container. The right pane already constrains
        // height via WikiLayout's flex-1 overflow-hidden. The inner
        // <div> takes the full width with p-10 (40 px) symmetric
        // margins so the markdown content has more breathing room
        // from the sidebar edge.
        <div className="flex-1 overflow-y-auto p-10">
            <div className="flex flex-col gap-6 w-full">
                <div className="flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => navigate(`/boards/${boardId}/wiki`)}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-blue"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        {UI_LABELS.WIKI}
                    </button>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setShowHistory((v) => !v)}
                            className="p-2 rounded-lg text-slate-500 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={UI_LABELS.WIKI_HISTORY}
                            aria-label={UI_LABELS.WIKI_HISTORY}
                            data-testid="wiki-history-toggle"
                        >
                            <History className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={onEdit}
                            className="p-2 rounded-lg text-slate-500 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-slate-800"
                            title={UI_LABELS.EDIT}
                            aria-label={UI_LABELS.EDIT}
                            data-testid="wiki-edit-button"
                        >
                            <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={handleArchive}
                            className="p-2 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title={UI_LABELS.DELETE}
                            aria-label={UI_LABELS.DELETE}
                            data-testid="wiki-archive-button"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div>
                    <h1
                        className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2"
                        data-testid="wiki-page-title"
                    >
                        {page.title}
                    </h1>
                    <p className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3 h-3" />
                        {updatedLabel}
                    </p>
                </div>

                <div
                    className="prose prose-slate dark:prose-invert max-w-none w-full"
                    data-testid="wiki-page-content"
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                    >
                        {page.content}
                    </ReactMarkdown>
                </div>
            </div>

            {showHistory && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 flex justify-end"
                    onClick={() => setShowHistory(false)}
                >
                    <aside
                        className="w-96 bg-white dark:bg-slate-900 shadow-xl p-6 overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">
                                {UI_LABELS.WIKI_HISTORY}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setShowHistory(false)}
                                className="text-xs text-slate-500 hover:text-accent-blue"
                            >
                                {UI_LABELS.CLOSE}
                            </button>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {UI_LABELS.WIKI_SHOW_LIMIT}
                            </label>
                            <select
                                value={historyLimit}
                                onChange={(e) =>
                                    setHistoryLimit(Number(e.target.value))
                                }
                                className="px-2 py-1 rounded-md text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                data-testid="wiki-history-limit"
                            >
                                {WIKI_VERSION_OPTIONS.map((opt) => (
                                    <option
                                        key={opt.value}
                                        value={opt.value}
                                    >
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {versionsLoading ? (
                            <div className="text-xs text-slate-400">
                                Loading…
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="text-xs text-slate-400">
                                No versions yet.
                            </div>
                        ) : (
                            <ul className="flex flex-col gap-1">
                                {versions.map((v) => (
                                    <li
                                        key={v.id}
                                        className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                    >
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                #{v.revisionNo}
                                            </span>
                                            <span className="text-[10px] text-slate-400 truncate">
                                                {new Date(
                                                    v.createdAt,
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRestoreVersion(v.id)
                                            }
                                            className="text-[10px] font-bold text-accent-blue hover:underline"
                                            data-testid="wiki-history-restore"
                                        >
                                            {UI_LABELS.WIKI_RESTORE}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>
                </div>
            )}

            <ConfirmationModal
                isOpen={showArchiveConfirm}
                title="Archive page"
                message={`Archive "${page.title}"? You can restore it from Trash.`}
                variant="warning"
                onConfirm={confirmArchive}
                onCancel={() => setShowArchiveConfirm(false)}
            />
        </div>
    );
};

export default WikiPageView;
