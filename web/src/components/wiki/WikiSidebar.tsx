import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, ChevronDown, FileText, Folder, Plus } from 'lucide-react';
import { WikiTreeNode } from '../../types/wiki';
import { UI_LABELS } from '../../lib/constants';

interface WikiSidebarProps {
    tree: WikiTreeNode[];
    onNewPage: (parentId: string | null) => void;
}

/**
 * Recursive tree node. Each page can be expanded/collapsed.
 * Active page (matches the `:pageId` URL param) gets a highlight.
 */
const TreeItem: React.FC<{
    node: WikiTreeNode;
    boardId: string;
    depth: number;
    activePageId: string | undefined;
}> = ({ node, boardId, depth, activePageId }) => {
    const [open, setOpen] = useState<boolean>(depth < 2);
    const hasChildren = node.children.length > 0;
    const isActive = node.page.id === activePageId;

    return (
        <div>
            <div
                className={`group flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
                    isActive
                        ? 'bg-accent-blue/15 text-accent-blue font-bold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={open ? 'Collapse' : 'Expand'}
                    // Don't render the chevron when there are no children.
                    style={hasChildren ? undefined : { visibility: 'hidden' }}
                >
                    {open ? (
                        <ChevronDown className="w-3 h-3" />
                    ) : (
                        <ChevronRight className="w-3 h-3" />
                    )}
                </button>
                <Link
                    to={`/boards/${boardId}/wiki/${node.page.id}`}
                    className="flex-1 truncate"
                >
                    {node.page.title || '(untitled)'}
                </Link>
            </div>
            {open &&
                hasChildren &&
                node.children.map((child) => (
                    <TreeItem
                        key={child.page.id}
                        node={child}
                        boardId={boardId}
                        depth={depth + 1}
                        activePageId={activePageId}
                    />
                ))}
        </div>
    );
};

/**
 * Flat root list + inline "+ New page" button. Renders nothing fancy
 * for an empty board — the parent layout shows its own empty state.
 */
const WikiSidebar: React.FC<WikiSidebarProps> = ({ tree, onNewPage }) => {
    const { boardId, pageId } = useParams<{
        boardId: string;
        pageId: string;
    }>();

    if (!boardId) return null;

    return (
        <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5" />
                    {UI_LABELS.WIKI}
                </h2>
                <button
                    type="button"
                    onClick={() => onNewPage(null)}
                    className="p-1 rounded-md text-slate-500 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title={UI_LABELS.WIKI_NEW_PAGE}
                    aria-label={UI_LABELS.WIKI_NEW_PAGE}
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {tree.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-xs text-slate-400">
                    <FileText className="w-6 h-6 opacity-40" />
                    <p>{UI_LABELS.WIKI_EMPTY}</p>
                </div>
            ) : (
                <nav className="flex flex-col gap-0.5 overflow-y-auto">
                    {tree.map((node) => (
                        <TreeItem
                            key={node.page.id}
                            node={node}
                            boardId={boardId}
                            depth={0}
                            activePageId={pageId}
                        />
                    ))}
                </nav>
            )}

            <div className="mt-auto pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                <Link
                    to={`/boards/${boardId}/wiki/trash`}
                    className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-accent-blue transition-colors"
                >
                    <FileText className="w-3.5 h-3.5" />
                    {UI_LABELS.WIKI_TRASH}
                </Link>
            </div>
        </aside>
    );
};

export default WikiSidebar;
