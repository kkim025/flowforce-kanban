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
 * Full-pane "new page" form. Mirrors WikiPageEdit's layout exactly so
 * the create experience matches the edit experience:
 *   - p-10 symmetric margins (40px top/left/right/bottom)
 *   - Action row pinned at top with Cancel + Create
 *   - Big title input (text-3xl, no label above)
 *   - Plain textarea fills remaining height (flex-1 min-h-0)
 *
 * We use a plain <textarea> rather than the full MarkdownEditor
 * because the content starts empty — there's nothing to preview
 * until the user types — and the editor's tab UI would just be
 * visual clutter. The created page can be polished in WikiPageEdit
 * immediately afterwards.
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
            className="flex-1 flex flex-col p-10 min-h-0 overflow-hidden"
            data-testid="wiki-new-page-form"
        >
            <div className="flex flex-col gap-4 w-full h-full min-h-0">
                <div className="flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-accent-blue"
                    >
                        <X className="w-3 h-3" />
                        {UI_LABELS.CANCEL}
                    </button>
                    <div className="flex items-center gap-2">
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
                </div>

                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={UI_LABELS.WIKI_PAGE_TITLE}
                    className="text-3xl font-black bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-300 shrink-0"
                    autoFocus
                    data-testid="wiki-new-page-title"
                />

                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="# Start writing…"
                    className="flex-1 min-h-0 resize-none px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono text-sm"
                    data-testid="wiki-new-page-content"
                />
            </div>
        </form>
    );
};

export default WikiNewPageForm;