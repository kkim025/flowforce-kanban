import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/notifications.repository.interface';
import {
  ListNotificationsQuery,
  NOTIFICATION_REPOSITORY,
  NotificationListResult,
} from '../../domain/notifications.repository.interface';

/**
 * Lists the current user's notifications, newest first, with optional
 * cursor + limit + unreadOnly filter. Always scoped to the supplied userId.
 */
@Injectable()
export class ListMyNotificationsUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(
    userId: string,
    query?: ListNotificationsQuery,
  ): Promise<NotificationListResult> {
    return this.notificationRepository.listForRecipient(userId, query);
  }
}
