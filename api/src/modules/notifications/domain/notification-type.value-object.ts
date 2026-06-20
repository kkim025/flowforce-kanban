/**
 * The four kinds of notifications FlowForce can produce. New types
 * (e.g. COMMENT_REPLY, SUBTASK_ASSIGNED) can be added without schema
 * changes — they only need to be wired into the listener.
 */
export enum NotificationType {
  ASSIGNMENT = 'ASSIGNMENT',
  MENTION = 'MENTION',
  SPRINT_STATUS = 'SPRINT_STATUS',
  DUE_DATE = 'DUE_DATE',
}

/** refType discriminator. The listener emits one of these two values. */
export type NotificationRefType = 'task' | 'sprint';

/** Milestone discriminator for due-date reminders. Used as a de-dup key. */
export type DueDateMilestone = '24h' | '1h' | 'due';
