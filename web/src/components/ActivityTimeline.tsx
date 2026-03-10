import React, { useState } from 'react';
import { 
    AlertCircle, 
    ArrowUpCircle, 
    User as UserIcon, 
    Tag as TagIcon, 
    Plus, 
    Trash2, 
    Pencil,
    History
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, Comment, User } from '../types';

interface ActivityTimelineProps {
    timelineItems: (Activity | Comment)[];
    user: User | null;
    users: User[];
    getInitials: (userId: string) => string;
    getUserName: (userId: string | null | undefined) => string;
    onUpdateComment: (comment: Comment, newContent: string) => void;
    onDeleteComment: (commentId: string) => void;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ 
    timelineItems, 
    user, 
    users, 
    getInitials, 
    getUserName,
    onUpdateComment,
    onDeleteComment
}) => {
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingContent, setEditingContent] = useState('');

    const handleUpdateComment = (comment: Comment) => {
        if (!editingContent.trim()) return;
        onUpdateComment(comment, editingContent.trim());
        setEditingCommentId(null);
        setEditingContent('');
    };

    return (
        <div className="pt-8 border-t border-slate-200 dark:border-white/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-3">
                <History className="w-4 h-4 text-accent-blue" />
                Activity
            </h3>

            <div className="space-y-8 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200 dark:before:bg-white/10">
                {timelineItems.map((item) => {
                    const isComment = 'content' in item;
                    const activity = item as Activity;
                    const comment = item as Comment;
                    const isEditing = editingCommentId === item.id;

                    return (
                        <div key={item.id} className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center z-10 overflow-hidden">
                                {isComment ? (
                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-bold text-[10px]">
                                        {getInitials(comment.userId)}
                                    </div>
                                ) : (
                                    <div className="text-slate-400">
                                        {activity.type === 'status_change' && <AlertCircle className="w-3.5 h-3.5" />}
                                        {activity.type === 'priority_change' && <ArrowUpCircle className="w-3.5 h-3.5" />}
                                        {activity.type === 'assignee_change' && <UserIcon className="w-3.5 h-3.5" />}
                                        {activity.type === 'tag_change' && <TagIcon className="w-3.5 h-3.5" />}
                                        {activity.type === 'task_created' && <Plus className="w-3.5 h-3.5" />}
                                    </div>
                                )}
                            </div>

                            <div className={isComment ? "glass p-4 rounded-2xl border border-white/5 bg-slate-50/50 dark:bg-white/5 group/comment" : ""}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                            {getUserName(item.userId)}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {new Date(item.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    
                                    {isComment && comment.userId === user?.id && !isEditing && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => {
                                                    setEditingCommentId(comment.id);
                                                    setEditingContent(comment.content);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-accent-blue hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                                title="Edit comment"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={() => onDeleteComment(comment.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                                title="Delete comment"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isComment ? (
                                    isEditing ? (
                                        <div className="space-y-3 mt-2">
                                            <textarea 
                                                autoFocus
                                                value={editingContent}
                                                onChange={(e) => setEditingContent(e.target.value)}
                                                className="w-full bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-accent-blue/20 outline-none resize-none min-h-[80px]"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => setEditingCommentId(null)}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateComment(comment)}
                                                    disabled={!editingContent.trim() || editingContent === comment.content}
                                                    className="px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest bg-accent-blue text-white disabled:opacity-50 transition-all"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-sm text-slate-700 dark:text-slate-300 prose prose-slate dark:prose-invert max-w-none mt-1">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {comment.content}
                                            </ReactMarkdown>
                                        </div>
                                    )
                                ) : (
                                    <div className="text-[11px] text-slate-500 font-medium italic">
                                        {activity.type === 'task_created' && 'created this task'}
                                        {activity.type === 'priority_change' && (
                                            <>changed priority from <span className="font-bold text-slate-400">{String(activity.details?.from)}</span> to <span className="font-bold text-accent-blue">{String(activity.details?.to)}</span></>
                                        )}
                                        {activity.type === 'assignee_change' && (
                                            <>changed assignee from <span className="font-bold text-slate-400">{getUserName(activity.details?.from as string)}</span> to <span className="font-bold text-accent-blue">{getUserName(activity.details?.to as string)}</span></>
                                        )}
                                        {activity.type === 'tag_change' && activity.details?.text}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ActivityTimeline;
