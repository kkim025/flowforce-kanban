import { Inject, Injectable } from '@nestjs/common';
import { Notification } from '../../domain/notification.entity';
import type { INotificationRepository } from '../../domain/notifications.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications.repository.interface';

/**
 * Marks a single notification as read for the supplied user.
 * Throws NotFoundException if the notification does not exist or does not
 * belong to the user (repository enforces ownership).
 */
@Injectable()
export class MarkAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(id: string, userId: string): Promise<Notification> {
    return this.notificationRepository.markRead(id, userId);
  }
}
