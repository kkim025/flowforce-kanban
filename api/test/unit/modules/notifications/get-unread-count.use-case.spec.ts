import { GetUnreadCountUseCase } from 'src/modules/notifications/application/use-cases/get-unread-count.use-case';
import { INotificationRepository } from 'src/modules/notifications/domain/notifications.repository.interface';

describe('GetUnreadCountUseCase', () => {
  let useCase: GetUnreadCountUseCase;
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
    useCase = new GetUnreadCountUseCase(mockRepo as any);
  });

  it('returns the unread count for the user', async () => {
    mockRepo.countUnreadForRecipient.mockResolvedValue(3);
    expect(await useCase.execute('u1')).toBe(3);
    expect(mockRepo.countUnreadForRecipient).toHaveBeenCalledWith('u1');
  });
});
