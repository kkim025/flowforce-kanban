import { Inject, Injectable } from '@nestjs/common';
import { Notification } from '../../domain/notification.entity';
import type { INotificationRepository } from '../../domain/notifications.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications.repository.interface';
import type { IUserNotificationPrefRepository } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';
import { USER_NOTIFICATION_PREF_REPOSITORY } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';

/**
 * Persists a notification unless the recipient has muted the type.
 * Returns the persisted entity, or `null` if the type is muted.
 * The listener branches on `null` to skip the socket push.
 */
@Injectable()
export class CreateNotificationUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
    @Inject(USER_NOTIFICATION_PREF_REPOSITORY)
    private readonly prefRepository: IUserNotificationPrefRepository,
  ) {}

  async execute(notification: Notification): Promise<Notification | null> {
    const enabled = await this.prefRepository.isEnabled(
      notification.recipientId,
      notification.type,
    );
    if (!enabled) {
      return null;
    }
    return this.notificationRepository.create(notification);
  }
}
