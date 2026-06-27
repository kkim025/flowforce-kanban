import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { NotificationType } from '../../../notifications/domain/notification-type.value-object';
import { UserNotificationPref } from '../../../notification-prefs/domain/user-notification-pref.entity';
import type { IUserNotificationPrefRepository } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';
import { USER_NOTIFICATION_PREF_REPOSITORY } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';

/**
 * Upserts a per-user, per-type notification preference.
 * Rejects unknown notification types so the route surface stays closed.
 */
@Injectable()
export class UpsertPrefUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_PREF_REPOSITORY)
    private readonly prefRepository: IUserNotificationPrefRepository,
  ) {}

  async execute(
    userId: string,
    type: NotificationType,
    inAppEnabled: boolean,
  ): Promise<UserNotificationPref> {
    const validTypes = Object.values(NotificationType) as string[];
    if (!validTypes.includes(type)) {
      throw new BadRequestException(`Unknown notification type: ${type}`);
    }
    return this.prefRepository.upsert(userId, type, inAppEnabled);
  }
}
