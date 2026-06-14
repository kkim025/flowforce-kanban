import { UpsertPrefUseCase } from 'src/modules/users/application/use-cases/upsert-pref.use-case';
import { IUserNotificationPrefRepository } from 'src/modules/users/domain/user-notification-prefs.repository.interface';
import { UserNotificationPref } from 'src/modules/notification-prefs/domain/user-notification-pref.entity';
import { NotificationType } from 'src/modules/notifications/domain/notification.entity';

describe('UpsertPrefUseCase', () => {
  let useCase: UpsertPrefUseCase;
  let mockRepo: jest.Mocked<IUserNotificationPrefRepository>;

  beforeEach(() => {
    mockRepo = {
      listForUser: jest.fn(),
      findOne: jest.fn(),
      isEnabled: jest.fn(),
      upsert: jest.fn(),
    };
    useCase = new UpsertPrefUseCase(mockRepo as any);
  });

  it('upserts and returns the pref', async () => {
    const pref = UserNotificationPref.create(
      { userId: 'u1', type: NotificationType.ASSIGNMENT, inAppEnabled: false },
      'p1',
    ).getValue();
    mockRepo.upsert.mockResolvedValue(pref);
    const result = await useCase.execute(
      'u1',
      NotificationType.ASSIGNMENT,
      false,
    );
    expect(result).toBe(pref);
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      'u1',
      NotificationType.ASSIGNMENT,
      false,
    );
  });

  it('rejects unknown notification types', async () => {
    await expect(
      useCase.execute('u1', 'UNKNOWN' as NotificationType, false),
    ).rejects.toThrow();
  });
});
