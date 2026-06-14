import { MarkAsReadUseCase } from 'src/modules/notifications/application/use-cases/mark-as-read.use-case';
import { INotificationRepository } from 'src/modules/notifications/domain/notifications.repository.interface';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('MarkAsReadUseCase', () => {
  let useCase: MarkAsReadUseCase;
  let mockRepo: jest.Mocked<INotificationRepository>;

  beforeEach(() => {
    mockRepo = {
      create: jest.fn(),
      findByIdForRecipient: jest.fn(),
      listForRecipient: jest.fn(),
      countUnreadForRecipient: jest.fn(),
      markRead: jest.fn(),
      markAllReadForRecipient: jest.fn(),
    };
    useCase = new MarkAsReadUseCase(mockRepo as any);
  });

  it('calls the repository with id and recipientId and returns the entity', async () => {
    const n = Notification.create(
      {
        recipientId: 'u1',
        type: NotificationType.ASSIGNMENT,
        title: 't',
        refType: 'task',
        refId: 't1',
      },
      'n1',
    ).getValue();
    n.markAsRead();
    mockRepo.markRead.mockResolvedValue(n);

    const result = await useCase.execute('n1', 'u1');
    expect(result).toBe(n);
    expect(mockRepo.markRead).toHaveBeenCalledWith('n1', 'u1');
  });

  it('propagates NotFoundException when the notification does not belong to the user', async () => {
    mockRepo.markRead.mockRejectedValue(new Error('Notification not found'));
    await expect(useCase.execute('n1', 'u1')).rejects.toThrow();
  });
});
