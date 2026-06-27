import { MarkAllAsReadUseCase } from 'src/modules/notifications/application/use-cases/mark-all-as-read.use-case';
import { INotificationRepository } from 'src/modules/notifications/domain/notifications.repository.interface';

describe('MarkAllAsReadUseCase', () => {
  let useCase: MarkAllAsReadUseCase;
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
    useCase = new MarkAllAsReadUseCase(mockRepo as any);
  });

  it('returns the number of updated rows', async () => {
    mockRepo.markAllReadForRecipient.mockResolvedValue(7);
    const result = await useCase.execute('u1');
    expect(result).toBe(7);
    expect(mockRepo.markAllReadForRecipient).toHaveBeenCalledWith('u1');
  });

  it('returns 0 when there are no unread notifications', async () => {
    mockRepo.markAllReadForRecipient.mockResolvedValue(0);
    expect(await useCase.execute('u1')).toBe(0);
  });
});
