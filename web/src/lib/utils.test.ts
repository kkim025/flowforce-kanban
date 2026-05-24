import { describe, it, expect } from 'vitest';
import { getSortedTimeline } from './utils';
import { Activity, Comment } from '../types';

describe('getSortedTimeline', () => {
    it('should sort activities and comments by date (oldest first)', () => {
        const activities: Activity[] = [
            { id: '1', taskId: 't1', userId: 'u1', type: 'task_created', createdAt: '2024-01-01T10:00:00Z' },
            { id: '3', taskId: 't1', userId: 'u1', type: 'priority_change', createdAt: '2024-01-01T12:00:00Z', details: { from: 'low', to: 'high' } },
        ];
        const comments: Comment[] = [
            { id: '2', taskId: 't1', userId: 'u1', content: 'First comment', createdAt: '2024-01-01T11:00:00Z' },
        ];

        const result = getSortedTimeline(activities, comments);

        expect(result).toHaveLength(3);
        expect(result[0].id).toBe('1'); // Oldest: 10:00
        expect(result[1].id).toBe('2'); // Middle: 11:00
        expect(result[2].id).toBe('3'); // Newest: 12:00
        expect(result[1].type).toBe('comment');
    });

    it('should handle empty inputs', () => {
        expect(getSortedTimeline([], [])).toEqual([]);
    });

    it('should filter out activities of type "comment"', () => {
        // Some activities might be of type 'comment' if duplicated in legacy data
        const activities: Activity[] = [
            { id: '1', taskId: 't1', userId: 'u1', type: 'comment', createdAt: '2024-01-01T10:00:00Z', details: { text: 'Legacy', commentId: 'c1' } },
        ];
        const comments: Comment[] = [
            { id: '2', taskId: 't1', userId: 'u1', content: 'Actual comment', createdAt: '2024-01-01T11:00:00Z' },
        ];

        const result = getSortedTimeline(activities, comments);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('2');
    });
});
