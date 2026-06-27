import { Inject, Injectable } from '@nestjs/common';
import { UserNotificationPref } from '../../../notification-prefs/domain/user-notification-pref.entity';
import type { IUserNotificationPrefRepository } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';
import { USER_NOTIFICATION_PREF_REPOSITORY } from '../../../notification-prefs/domain/user-notification-prefs.repository.interface';

@Injectable()
export class ListPrefsUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_PREF_REPOSITORY)
    private readonly prefRepository: IUserNotificationPrefRepository,
  ) {}

  async execute(userId: string): Promise<UserNotificationPref[]> {
    return this.prefRepository.listForUser(userId);
  }
}
