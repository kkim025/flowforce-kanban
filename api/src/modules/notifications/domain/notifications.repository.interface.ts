import { Notification } from './notification.entity';

export interface ListNotificationsQuery {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export interface NotificationListResult {
  items: Notification[];
  nextCursor: string | null;
}

/**
 * Per-user repository. Every method that reads or mutates MUST be scoped
 * to the supplied `recipientId` — there is no admin override. The
 * controller never sees another user's notifications.
 */
export interface INotificationRepository {
  /** Creates a new notification. Returns the persisted entity (with id). */
  create(notification: Notification): Promise<Notification>;

  /** Returns a notification if it exists AND belongs to the recipient; otherwise null. */
  findByIdForRecipient(
    id: string,
    recipientId: string,
  ): Promise<Notification | null>;

  /** Lists notifications for a recipient, newest first, cursor-paginated. */
  listForRecipient(
    recipientId: string,
    query?: ListNotificationsQuery,
  ): Promise<NotificationListResult>;

  /** Returns the unread count for a recipient. */
  countUnreadForRecipient(recipientId: string): Promise<number>;

  /** Marks a single notification as read. No-op if already read. Throws if not found. */
  markRead(id: string, recipientId: string): Promise<Notification>;

  /** Marks every currently-unread notification for the recipient as read. Returns the count. */
  markAllReadForRecipient(recipientId: string): Promise<number>;
}

export const NOTIFICATION_REPOSITORY = 'INotificationRepository';
