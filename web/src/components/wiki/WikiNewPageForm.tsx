import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { createWikiPage } from '../../lib/wiki';
import { useToast } from '../../hooks/useToast';
import { UI_LABELS } from '../../lib/constants';

interface WikiNewPageFormProps {
    boardId: string;
    parentId: string | null;
    onCancel: () => void;
    onCreated: (pageId: string) => void;
}

/**
 * Inline "new page" form. Plain <input> + <textarea> in MVP — no
 * MarkdownEditor preview tab because the content is empty when
 * creating. Edit-in-place happens via WikiPageEdit.
 */
const WikiNewPageForm: React.FC<WikiNewPageFormProps> = ({
    boardId,
    parentId,
    onCancel,
    onCreated,
}) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { showToast } = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            showToast('Title and content are required', 'error');
            return;
        }
        setSubmitting(true);
        try {
            const page = await createWikiPage(boardId, {
                title: title.trim(),
                content,
                parentId,
            });
            showToast('Page created', 'success');
            onCreated(page.id);
            navigate(`/boards/${boardId}/wiki/${page.id}`);
        } catch (err) {
            showToast(
                err instanceof Error ? err.message : 'Failed to create page',
                'error',
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40"
            data-testid="wiki-new-page-form"
        >
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {UI_LABELS.WIKI_PAGE_TITLE}
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-accent-blue/30"
                    autoFocus
                    data-testid="wiki-new-page-title"
                />
            </div>
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {UI_LABELS.DESCRIPTION}
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# Heading"
                    rows={10}
                    className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono text-sm"
                    data-testid="wiki-new-page-content"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                    <X className="w-3.5 h-3.5 inline mr-1" />
                    {UI_LABELS.CANCEL}
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-blue text-white shadow hover:shadow-md disabled:opacity-50"
                    data-testid="wiki-new-page-submit"
                >
                    <Save className="w-3.5 h-3.5 inline mr-1" />
                    {submitting ? '...' : UI_LABELS.CREATE_TASK}
                </button>
            </div>
        </form>
    );
};

export default WikiNewPageForm;
