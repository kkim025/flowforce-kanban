import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Comment, User } from '../types';
import { useUsers } from '../store/UserContext';
import { UI_LABELS } from '../lib/constants';

interface CommentItemProps {
    comment: Comment;
    user: User | null;
    onUpdate: (comment: Comment, newContent: string) => void;
    onDelete: (commentId: string) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
    comment,
    user,
    onUpdate,
    onDelete
}) => {
    const { getInitials, getUserName } = useUsers();
    const [isEditing, setIsEditing] = useState(false);
    const [editingContent, setEditingContent] = useState(comment.content);

    const handleUpdate = () => {
        if (!editingContent.trim() || editingContent === comment.content) {
            setIsEditing(false);
            return;
        }
        onUpdate(comment, editingContent.trim());
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (editingContent !== comment.content) {
            if (window.confirm(UI_LABELS.UNSAVED_CHANGES)) {
                setIsEditing(false);
                setEditingContent(comment.content);
            }
        } else {
            setIsEditing(false);
            setEditingContent(comment.content);
        }
    };

    const isAuthor = comment.userId === user?.id;

    return (
        <div className="relative pl-10">
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-500 border border-blue-600 flex items-center justify-center text-white font-bold text-[10px] z-10 overflow-hidden">
                {getInitials(comment.userId)}
            </div>

            <div className="glass p-4 rounded-2xl border border-white/5 bg-slate-50/50 dark:bg-white/5 group/comment">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-wider">
                            {getUserName(comment.userId)}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(comment.createdAt).toLocaleString()}
                        </span>
                    </div>
                    
                    {isAuthor && !isEditing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                            <button 
                                onClick={() => {
                                    setEditingContent(comment.content);
                                    setIsEditing(true);
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                title="Edit comment"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                                onClick={() => onDelete(comment.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                title="Delete comment"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {isEditing ? (
                    <div className="space-y-3 mt-2">
                        <textarea 
                            autoFocus
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-accent-blue/20 outline-none resize-none min-h-[80px]"
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={handleCancel}
                                className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                            >
                                {UI_LABELS.CANCEL}
                            </button>
                            <button 
                                onClick={handleUpdate}
                                disabled={!editingContent.trim() || editingContent === comment.content}
                                className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-accent-blue text-white disabled:opacity-50 transition-all"
                            >
                                {UI_LABELS.SAVE}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none mt-1">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
                            {comment.content}
                        </ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CommentItem;
