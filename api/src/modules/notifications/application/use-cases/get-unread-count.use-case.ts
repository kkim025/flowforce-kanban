import { Inject, Injectable } from '@nestjs/common';
import type { INotificationRepository } from '../../domain/notifications.repository.interface';
import { NOTIFICATION_REPOSITORY } from '../../domain/notifications.repository.interface';

@Injectable()
export class GetUnreadCountUseCase {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async execute(userId: string): Promise<number> {
    return this.notificationRepository.countUnreadForRecipient(userId);
  }
}
