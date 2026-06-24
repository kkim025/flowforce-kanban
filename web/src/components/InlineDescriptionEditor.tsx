import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import MarkdownEditor from './MarkdownEditor';
import { Task } from '../types';
import { UI_LABELS } from '../lib/constants';

interface InlineDescriptionEditorProps {
    task: Task;
    onDescriptionSave: (description: string) => void;
}

const InlineDescriptionEditor: React.FC<InlineDescriptionEditorProps> = ({
    task,
    onDescriptionSave,
}) => {
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editDescription, setEditDescription] = useState(task.description || '');
    const descriptionEditRef = useRef<HTMLDivElement>(null);

    // Reset editDescription when task.description changes externally
    useEffect(() => {
        if (!isEditingDescription) {
            setEditDescription(task.description || '');
        }
    }, [task.description, isEditingDescription]);

    // Auto-save on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isEditingDescription && descriptionEditRef.current && !descriptionEditRef.current.contains(event.target as Node)) {
                onDescriptionSave(editDescription);
                setIsEditingDescription(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isEditingDescription, editDescription, onDescriptionSave]);

    const handleEditDescription = () => {
        setEditDescription(task.description || '');
        setIsEditingDescription(true);
    };

    const handleSaveDescription = () => {
        onDescriptionSave(editDescription);
        setIsEditingDescription(false);
    };

    const handleCancelDescription = () => {
        setEditDescription(task.description || '');
        setIsEditingDescription(false);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <MessageSquare className="w-4 h-4" />
                {UI_LABELS.DESCRIPTION}
            </div>
            {isEditingDescription ? (
                <div className="space-y-3" ref={descriptionEditRef}>
                    <div className="glass rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300">
                        <MarkdownEditor
                            value={editDescription}
                            onChange={setEditDescription}
                            placeholder={UI_LABELS.ADD_DETAILS}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveDescription}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-accent-blue text-white shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/40 transition-all text-xs"
                        >
                            <Save className="w-3.5 h-3.5" />
                            Save
                        </button>
                        <button
                            onClick={handleCancelDescription}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-all text-xs text-slate-600 dark:text-slate-300"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    onClick={handleEditDescription}
                    className="prose prose-slate dark:prose-invert max-w-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl p-3 -m-3 transition-colors"
                >
                    {task.description ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {task.description}
                        </ReactMarkdown>
                    ) : (
                        <p className="text-slate-400 italic text-sm">{UI_LABELS.NO_DESCRIPTION}</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default InlineDescriptionEditor;