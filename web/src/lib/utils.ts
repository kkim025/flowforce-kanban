import { Activity, Comment, TimeUnit, TIME_UNIT_CONVERSIONS } from '../types';

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

export function convertToMinutes(value: number, unit: TimeUnit): number {
    return value * TIME_UNIT_CONVERSIONS[unit];
}

export function convertFromMinutes(minutes: number, unit: TimeUnit): number {
    return Math.round(minutes / TIME_UNIT_CONVERSIONS[unit]);
}

export function formatTime(minutes: number): string {
    if (minutes >= 2400) {
        const weeks = Math.floor(minutes / 2400);
        const remaining = minutes % 2400;
        if (remaining === 0) return `${weeks}w`;
        const days = Math.floor(remaining / 480);
        return days > 0 ? `${weeks}w ${days}d` : `${weeks}w`;
    }
    if (minutes >= 480) {
        const days = Math.floor(minutes / 480);
        const remaining = minutes % 480;
        if (remaining === 0) return `${days}d`;
        const hours = Math.floor(remaining / 60);
        return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    if (minutes >= 60) {
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;
        return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    }
    return `${minutes}m`;
}
