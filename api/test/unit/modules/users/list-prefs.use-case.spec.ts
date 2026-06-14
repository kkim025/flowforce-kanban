import { ListPrefsUseCase } from 'src/modules/users/application/use-cases/list-prefs.use-case';
import { IUserNotificationPrefRepository } from 'src/modules/users/domain/user-notification-prefs.repository.interface';
import { UserNotificationPref } from 'src/modules/notification-prefs/domain/user-notification-pref.entity';
import { NotificationType } from 'src/modules/notifications/domain/notification.entity';

describe('ListPrefsUseCase', () => {
  let useCase: ListPrefsUseCase;
  let mockRepo: jest.Mocked<IUserNotificationPrefRepository>;

  beforeEach(() => {
    mockRepo = {
      listForUser: jest.fn(),
      findOne: jest.fn(),
      isEnabled: jest.fn(),
      upsert: jest.fn(),
    };
    useCase = new ListPrefsUseCase(mockRepo as any);
  });

  it('returns the list of prefs for the user', async () => {
    const prefs = [
      UserNotificationPref.create(
        {
          userId: 'u1',
          type: NotificationType.ASSIGNMENT,
          inAppEnabled: false,
        },
        'p1',
      ).getValue(),
    ];
    mockRepo.listForUser.mockResolvedValue(prefs);
    const result = await useCase.execute('u1');
    expect(result).toEqual(prefs);
    expect(mockRepo.listForUser).toHaveBeenCalledWith('u1');
  });

  it('returns an empty array when the user has no explicit mutes', async () => {
    mockRepo.listForUser.mockResolvedValue([]);
    expect(await useCase.execute('u1')).toEqual([]);
  });
});
