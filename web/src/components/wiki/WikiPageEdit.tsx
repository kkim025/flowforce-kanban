import React, { useEffect, useState } from 'react';
import { Save, X, ArrowLeft } from 'lucide-react';
import MarkdownEditor from '../MarkdownEditor';
import { WikiPage } from '../../types/wiki';
import { getWikiPage, updateWikiPage } from '../../lib/wiki';
import { useToast } from '../../hooks/useToast';
import { UI_LABELS } from '../../lib/constants';

interface WikiPageEditProps {
    boardId: string;
    pageId: string;
    /**
     * Pre-loaded page from the parent. When provided, the component
     * skips its own `getWikiPage` call (single-fetch behavior — the
     * page is already loaded by `WikiLayout` for the read view).
     * Pass `null` if the page failed to load; the form stays disabled
     * until the parent re-fetches.
     */
    initialPage?: WikiPage | null;
    onSaved: (page: WikiPage) => void;
    onCancel: () => void;
}

const WikiPageEdit: React.FC<WikiPageEditProps> = ({
    boardId,
    pageId,
    initialPage,
    onSaved,
    onCancel,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(initialPage === undefined);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // Fast path: parent already loaded the page. Skip the fetch.
        if (initialPage !== undefined) {
            if (initialPage) {
                setTitle(initialPage.title);
                setContent(initialPage.content);
            }
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        getWikiPage(boardId, pageId)
            .then((p) => {
                if (cancelled) return;
                setTitle(p.title);
                setContent(p.content);
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
        return () => {
            cancelled = true;
        };
    }, [boardId, pageId, showToast, initialPage]);

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            showToast('Title and content are required', 'error');
            return;
        }
        setSaving(true);
        try {
            const updated = await updateWikiPage(boardId, pageId, {
                title: title.trim(),
                content,
            });
            showToast('Saved', 'success');
            onSaved(updated);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Save failed',
                'error',
            );
        } finally {
            setSaving(false);
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
        // Full-width + full-height editor. WikiLayout already gives
        // us a fixed-height right pane; we fill it with a flex column
        // (action row at top, title input below, editor body fills
        // the rest) and let the outer `overflow-y-auto` on WikiLayout's
        // main handle scrolling. p-10 (40 px) gives symmetric margins
        // matching the read view.
        <div className="flex-1 flex flex-col p-10 min-h-0 overflow-hidden">
            <div className="flex flex-col gap-4 w-full h-full min-h-0">
                <div className="flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-blue"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        {UI_LABELS.CANCEL}
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                        >
                            <X className="w-3.5 h-3.5 inline mr-1" />
                            {UI_LABELS.CANCEL}
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-blue text-white shadow hover:shadow-md disabled:opacity-50"
                            data-testid="wiki-edit-save"
                        >
                            <Save className="w-3.5 h-3.5 inline mr-1" />
                            {saving ? '...' : UI_LABELS.SAVE}
                        </button>
                    </div>
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={UI_LABELS.WIKI_PAGE_TITLE}
                    className="text-3xl font-black bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-300 shrink-0"
                    data-testid="wiki-edit-title"
                />

                <div className="flex-1 min-h-0">
                    <MarkdownEditor
                        value={content}
                        onChange={setContent}
                        placeholder="# Start writing…"
                    />
                </div>
            </div>
        </div>
    );
};

export default WikiPageEdit;
