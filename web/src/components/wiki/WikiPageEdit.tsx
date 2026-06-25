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
    onSaved: (page: WikiPage) => void;
    onCancel: () => void;
}

const WikiPageEdit: React.FC<WikiPageEditProps> = ({
    boardId,
    pageId,
    onSaved,
    onCancel,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
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
    }, [boardId, pageId, showToast]);

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
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
                <div className="flex items-center justify-between">
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
                    className="text-3xl font-black bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-300"
                    data-testid="wiki-edit-title"
                />

                <MarkdownEditor
                    value={content}
                    onChange={setContent}
                    placeholder="# Start writing…"
                />
            </div>
        </div>
    );
};

export default WikiPageEdit;
