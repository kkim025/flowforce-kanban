import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { User } from '../types';
import { useUsers } from '../store/UserContext';
import { UI_LABELS } from '../lib/constants';

interface CommentFormProps {
    user: User | null;
    onAddComment: (content: string) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({
    user,
    onAddComment
}) => {
    const { getInitials } = useUsers();
    const [commentInput, setCommentInput] = useState('');

    const handleAddComment = () => {
        if (!commentInput.trim()) return;
        onAddComment(commentInput.trim());
        setCommentInput('');
    };

    return (
        <div className="mt-8 pl-10 relative pb-12">
            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-blue-500 border border-blue-600 flex items-center justify-center text-white font-bold text-[10px] z-10">
                {user ? getInitials(user.id) : '?'}
            </div>
            <div className="glass p-4 rounded-2xl border border-white/10 space-y-3 focus-within:ring-2 focus-within:ring-accent-blue/20 transition-all duration-300 bg-slate-50/50 dark:bg-white/5">
                <textarea 
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full bg-transparent border-none p-0 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 outline-none resize-none min-h-[80px]"
                />
                <div className="flex justify-end">
                    <button 
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold bg-accent-blue text-white transition-all text-[11px] disabled:opacity-50"
                    >
                        <Send className="w-3 h-3" />
                        {UI_LABELS.COMMENT}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommentForm;
