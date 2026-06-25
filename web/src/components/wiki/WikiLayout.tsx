import React, { useEffect, useState, useCallback } from 'react';
import {
    Outlet,
    useLocation,
    useNavigate,
    useParams,
} from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { WikiTreeNode, WikiPage } from '../../types/wiki';
import {
    getWikiTree,
    getWikiPage,
} from '../../lib/wiki';
import { useToast } from '../../hooks/useToast';
import { UI_LABELS } from '../../lib/constants';
import WikiSidebar from './WikiSidebar';
import WikiPageView from './WikiPageView';
import WikiPageEdit from './WikiPageEdit';
import WikiTrash from './WikiTrash';
import WikiNewPageForm from './WikiNewPageForm';

/**
 * Wiki layout. Three responsibilities:
 *   1. Load + cache the page tree once per board visit.
 *   2. Decide what to show in the right pane based on the URL
 *      (index, :pageId read mode, :pageId edit mode, /trash).
 *      We use local state for edit mode instead of a separate URL
 *      so the back button stays predictable.
 *   3. Render the inline new-page form when the user clicks "+".
 */
const WikiLayout: React.FC = () => {
    const { boardId, pageId } = useParams<{
        boardId: string;
        pageId: string;
    }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { showToast } = useToast();

    const [tree, setTree] = useState<WikiTreeNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(true);
    const [editing, setEditing] = useState(false);
    const [creating, setCreating] = useState<{
        parentId: string | null;
    } | null>(null);
    // Bumped after a successful save so the child re-fetches.
    const [reloadKey, setReloadKey] = useState(0);
    const [currentPage, setCurrentPage] = useState<WikiPage | null>(null);

    const loadTree = useCallback(async () => {
        if (!boardId) return;
        // /trash view doesn't need the tree — save the round-trip.
        if (location.pathname.endsWith('/trash')) return;
        setLoadingTree(true);
        try {
            const t = await getWikiTree(boardId);
            setTree(t);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Failed to load wiki',
                'error',
            );
        } finally {
            setLoadingTree(false);
        }
    }, [boardId, showToast, location.pathname]);

    useEffect(() => {
        loadTree();
        // Reset edit mode on board switch.
        setEditing(false);
        setCreating(null);
    }, [loadTree]);

    // After navigating to a different pageId, exit edit mode.
    useEffect(() => {
        setEditing(false);
    }, [pageId]);

    // Load the current page when pageId changes (used by view/edit).
    useEffect(() => {
        if (!boardId || !pageId) {
            setCurrentPage(null);
            return;
        }
        let cancelled = false;
        getWikiPage(boardId, pageId)
            .then((p) => {
                if (!cancelled) setCurrentPage(p);
            })
            .catch(() => {
                if (!cancelled) setCurrentPage(null);
            });
        return () => {
            cancelled = true;
        };
    }, [boardId, pageId, reloadKey]);

    if (!boardId) {
        return (
            <div className="p-8 text-slate-400 text-sm">
                Missing board id in URL.
            </div>
        );
    }

    // /trash → render the trash view, no right pane route.
    if (location.pathname.endsWith('/trash')) {
        return (
            <div className="flex h-full">
                <WikiSidebar
                    tree={tree}
                    onNewPage={(parentId) => setCreating({ parentId })}
                />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <WikiTrash boardId={boardId} />
                </main>
            </div>
        );
    }

    // No pageId → tree view, optionally with new-page form.
    if (!pageId) {
        return (
            <div className="flex h-full">
                <WikiSidebar
                    tree={tree}
                    onNewPage={(parentId) => setCreating({ parentId })}
                />
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                                {UI_LABELS.WIKI}
                            </h1>
                            <button
                                type="button"
                                onClick={() => navigate('/')}
                                className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-blue"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                {UI_LABELS.BACK_TO_BOARD}
                            </button>
                        </div>
                        {loadingTree ? (
                            <p className="text-slate-400 text-sm">
                                Loading…
                            </p>
                        ) : creating ? (
                            <WikiNewPageForm
                                boardId={boardId}
                                parentId={creating.parentId}
                                onCancel={() => setCreating(null)}
                                onCreated={() => {
                                    setCreating(null);
                                    loadTree();
                                }}
                            />
                        ) : tree.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <p className="text-slate-400 text-sm">
                                    {UI_LABELS.WIKI_EMPTY}
                                </p>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCreating({ parentId: null })
                                    }
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-accent-blue text-white shadow hover:shadow-md"
                                >
                                    {UI_LABELS.WIKI_NEW_PAGE}
                                </button>
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm">
                                Select a page from the sidebar.
                            </p>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // Has pageId → show read view or edit view.
    return (
        <div className="flex h-full">
            <WikiSidebar
                tree={tree}
                onNewPage={(parentId) => setCreating({ parentId })}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                {creating ? (
                    <div className="flex-1 overflow-y-auto p-8">
                        <div className="max-w-3xl mx-auto">
                            <WikiNewPageForm
                                boardId={boardId}
                                parentId={creating.parentId}
                                onCancel={() => setCreating(null)}
                                onCreated={() => {
                                    setCreating(null);
                                    loadTree();
                                }}
                            />
                        </div>
                    </div>
                ) : editing ? (
                    <WikiPageEdit
                        boardId={boardId}
                        pageId={pageId}
                        onSaved={(p) => {
                            setCurrentPage(p);
                            setEditing(false);
                            setReloadKey((k) => k + 1);
                        }}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <WikiPageView
                        key={reloadKey}
                        boardId={boardId}
                        pageId={pageId}
                        onEdit={() => setEditing(true)}
                        onDeleted={() => {
                            loadTree();
                            navigate(`/boards/${boardId}/wiki`);
                        }}
                    />
                )}
            </main>
            {/* Outlet reserved for future sub-routes (e.g. /page/:pageId/history). */}
            <Outlet />
        </div>
    );
};

export default WikiLayout;
