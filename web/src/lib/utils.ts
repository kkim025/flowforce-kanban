import { Activity, Comment } from '../types';

export type TimelineItem = (Activity | (Comment & { type: 'comment' }));

/**
 * Combines activities and comments and sorts them by creation date (oldest first).
 */
export const getSortedTimeline = (activities: Activity[] = [], comments: Comment[] = []): TimelineItem[] => {
    const combined: TimelineItem[] = [
        ...activities.filter(a => a.type !== 'comment'),
        ...comments.map(c => ({ ...c, type: 'comment' as const }))
    ];

    return combined.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateA - dateB;
    });
};
