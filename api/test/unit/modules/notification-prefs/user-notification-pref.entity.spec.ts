import { UserNotificationPref } from 'src/modules/notification-prefs/domain/user-notification-pref.entity';
import { NotificationType } from 'src/modules/notifications/domain/notification.entity';

describe('UserNotificationPref entity', () => {
  describe('create', () => {
    it('returns Result.ok with prefs when valid', () => {
      const result = UserNotificationPref.create({
        userId: 'user-1',
        type: NotificationType.ASSIGNMENT,
        inAppEnabled: false,
      });
      expect(result.isSuccess).toBe(true);
      const pref = result.getValue();
      expect(pref.userId).toBe('user-1');
      expect(pref.type).toBe(NotificationType.ASSIGNMENT);
      expect(pref.inAppEnabled).toBe(false);
    });

    it('defaults inAppEnabled to true when omitted', () => {
      const pref = UserNotificationPref.create({
        userId: 'user-1',
        type: NotificationType.MENTION,
      }).getValue();
      expect(pref.inAppEnabled).toBe(true);
    });

    it('accepts a server-supplied id', () => {
      const pref = UserNotificationPref.create(
        { userId: 'user-1', type: NotificationType.ASSIGNMENT },
        'pref-1',
      ).getValue();
      expect(pref.id).toBe('pref-1');
    });

    it('returns Result.fail when userId is empty', () => {
      const result = UserNotificationPref.create({
        userId: '',
        type: NotificationType.ASSIGNMENT,
      });
      expect(result.isFailure).toBe(true);
    });

    it('returns Result.fail when type is missing', () => {
      const result = UserNotificationPref.create({
        userId: 'user-1',
        type: undefined as any,
      });
      expect(result.isFailure).toBe(true);
    });
  });
});
