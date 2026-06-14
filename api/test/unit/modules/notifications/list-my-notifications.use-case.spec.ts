import { ListMyNotificationsUseCase } from 'src/modules/notifications/application/use-cases/list-my-notifications.use-case';
import { INotificationRepository } from 'src/modules/notifications/domain/notifications.repository.interface';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('ListMyNotificationsUseCase', () => {
  let useCase: ListMyNotificationsUseCase;
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
    useCase = new ListMyNotificationsUseCase(mockRepo as any);
  });

  it('returns items and nextCursor from the repository', async () => {
    const items = [
      Notification.create(
        {
          recipientId: 'u1',
          type: NotificationType.ASSIGNMENT,
          title: 't',
          refType: 'task',
          refId: 't1',
        },
        'n1',
      ).getValue(),
    ];
    mockRepo.listForRecipient.mockResolvedValue({ items, nextCursor: 'n1' });

    const result = await useCase.execute('u1', { limit: 20 });
    expect(result.items).toEqual(items);
    expect(result.nextCursor).toBe('n1');
    expect(mockRepo.listForRecipient).toHaveBeenCalledWith('u1', { limit: 20 });
  });

  it('passes through cursor and unreadOnly', async () => {
    mockRepo.listForRecipient.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    await useCase.execute('u1', { limit: 5, cursor: 'c', unreadOnly: true });
    expect(mockRepo.listForRecipient).toHaveBeenCalledWith('u1', {
      limit: 5,
      cursor: 'c',
      unreadOnly: true,
    });
  });
});
