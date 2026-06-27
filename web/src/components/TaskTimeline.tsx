import React from 'react';
import { 
    AlertCircle, 
    ArrowUpCircle, 
    User as UserIcon, 
    Tag as TagIcon, 
    Plus, 
    History,
    CheckSquare
} from 'lucide-react';
import { Activity, Comment, User } from '../types';
import { useUsers } from '../store/UserContext';
import CommentItem from './CommentItem';

interface TaskTimelineProps {
    timelineItems: (Activity | Comment)[];
    user: User | null;
    onUpdateComment: (comment: Comment, newContent: string) => void;
    onDeleteComment: (commentId: string) => void;
}

const TaskTimeline: React.FC<TaskTimelineProps> = ({ 
    timelineItems, 
    user, 
    onUpdateComment,
    onDeleteComment
}) => {
    const { getUserName } = useUsers();

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

                    if (isComment) {
                        return (
                            <CommentItem
                                key={comment.id}
                                comment={comment}
                                user={user}
                                onUpdate={onUpdateComment}
                                onDelete={onDeleteComment}
                            />
                        );
                    }

                    return (
                        <div key={activity.id} className="relative pl-10">
                            <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 flex items-center justify-center z-10 overflow-hidden text-slate-400">
                                {activity.type === 'status_change' && <AlertCircle className="w-3.5 h-3.5" />}
                                {activity.type === 'priority_change' && <ArrowUpCircle className="w-3.5 h-3.5" />}
                                {activity.type === 'assignee_change' && <UserIcon className="w-3.5 h-3.5" />}
                                {activity.type === 'tag_change' && <TagIcon className="w-3.5 h-3.5" />}
                                {activity.type === 'task_created' && <Plus className="w-3.5 h-3.5" />}
                                {activity.type === 'checklist_added' && <CheckSquare className="w-3.5 h-3.5" />}
                                {!['status_change', 'priority_change', 'assignee_change', 'tag_change', 'task_created', 'checklist_added'].includes(activity.type) && <History className="w-3.5 h-3.5" />}
                            </div>

                            <div className="mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-wider">
                                        {getUserName(activity.userId)}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        {new Date(activity.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium italic mt-1">
                                    {activity.type === 'task_created' && 'created this task'}
                                    {activity.type === 'priority_change' && (
                                        <>changed priority from <span className="font-bold text-slate-400">{activity.details.from}</span> to <span className="font-bold text-accent-blue">{activity.details.to}</span></>
                                    )}
                                    {activity.type === 'assignee_change' && (
                                        <>changed assignee from <span className="font-bold text-slate-400">{getUserName(activity.details.from)}</span> to <span className="font-bold text-accent-blue">{getUserName(activity.details.to)}</span></>
                                    )}
                                    {activity.type === 'status_change' && (
                                        <>moved from <span className="font-bold text-slate-400">{activity.details.from}</span> to <span className="font-bold text-accent-blue">{activity.details.to}</span></>
                                    )}
                                    {activity.type === 'tag_change' && activity.details.text}
                                    {activity.type === 'checklist_added' && `added checklist: ${activity.details.title}`}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TaskTimeline;
