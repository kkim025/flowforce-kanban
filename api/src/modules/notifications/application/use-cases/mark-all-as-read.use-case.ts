import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/notifications.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications.repository.interface';

/**
 * Marks every currently-unread notification for the user as read.
 * Returns the number of rows that transitioned from unread to read.
 */
@Injectable()
export class MarkAllAsReadUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(userId: string): Promise<number> {
    return this.notificationRepository.markAllReadForRecipient(userId);
  }
}
