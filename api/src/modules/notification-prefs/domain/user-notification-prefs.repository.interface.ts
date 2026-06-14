import { UserNotificationPref } from './user-notification-pref.entity';
import { NotificationType } from '../../notifications/domain/notification-type.value-object';

export interface IUserNotificationPrefRepository {
  /** Returns all prefs for the user. Empty array if user has no explicit mutes. */
  listForUser(userId: string): Promise<UserNotificationPref[]>;

  /** Returns a single pref, or null if the user has not set one for this type. */
  findOne(
    userId: string,
    type: NotificationType,
  ): Promise<UserNotificationPref | null>;

  /**
   * Returns whether the user allows in-app notifications of the given type.
   * No row = allowed (most-permissive default). Mute is the explicit opt-out.
   */
  isEnabled(userId: string, type: NotificationType): Promise<boolean>;

  /**
   * Upserts a pref. Passing `inAppEnabled = true` will create the row even
   * though it's a no-op semantically — that's fine, it just means "explicit
   * allow" instead of "implicit allow" and the listener treats both the same.
   */
  upsert(
    userId: string,
    type: NotificationType,
    inAppEnabled: boolean,
  ): Promise<UserNotificationPref>;

  /**
   * Returns the set of recipients (out of the given ids) who have the given
   * notification type enabled. Used to fan out without an N+1 per-recipient
   * preference check.
   */
  filterEnabled(
    recipientIds: string[],
    type: NotificationType,
  ): Promise<string[]>;
}

export const USER_NOTIFICATION_PREF_REPOSITORY =
  'IUserNotificationPrefRepository';
