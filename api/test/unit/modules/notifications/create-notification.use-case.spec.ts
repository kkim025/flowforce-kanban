import { CreateNotificationUseCase } from 'src/modules/notifications/application/use-cases/create-notification.use-case';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';
import { INotificationRepository } from 'src/modules/notifications/domain/notifications.repository.interface';
import { IUserNotificationPrefRepository } from 'src/modules/users/domain/user-notification-prefs.repository.interface';

describe('CreateNotificationUseCase', () => {
  let useCase: CreateNotificationUseCase;
  let mockNotifRepo: jest.Mocked<INotificationRepository>;
  let mockPrefRepo: jest.Mocked<IUserNotificationPrefRepository>;

  beforeEach(() => {
    mockNotifRepo = {
      create: jest.fn(),
      findByIdForRecipient: jest.fn(),
      listForRecipient: jest.fn(),
      countUnreadForRecipient: jest.fn(),
      markRead: jest.fn(),
      markAllReadForRecipient: jest.fn(),
    };
    mockPrefRepo = {
      listForUser: jest.fn(),
      findOne: jest.fn(),
      isEnabled: jest.fn(),
      upsert: jest.fn(),
    };
    useCase = new CreateNotificationUseCase(
      mockNotifRepo as any,
      mockPrefRepo as any,
    );
  });

  it('persists the notification and returns the entity when prefs allow', async () => {
    const n = Notification.create({
      recipientId: 'user-1',
      actorId: 'user-2',
      type: NotificationType.ASSIGNMENT,
      title: 'X',
      refType: 'task',
      refId: 'task-1',
    }).getValue();
    mockPrefRepo.isEnabled.mockResolvedValue(true);
    const persisted = Notification.create(
      { ...n.props, actorId: 'user-2' },
      'new-id',
    ).getValue();
    mockNotifRepo.create.mockResolvedValue(persisted);

    const result = await useCase.execute(n);

    expect(result).toBe(persisted);
    expect(mockPrefRepo.isEnabled).toHaveBeenCalledWith(
      'user-1',
      NotificationType.ASSIGNMENT,
    );
    expect(mockNotifRepo.create).toHaveBeenCalledWith(n);
  });

  it('returns null and does NOT persist when the type is muted', async () => {
    const n = Notification.create({
      recipientId: 'user-1',
      actorId: 'user-2',
      type: NotificationType.MENTION,
      title: 'X',
      refType: 'task',
      refId: 'task-1',
    }).getValue();
    mockPrefRepo.isEnabled.mockResolvedValue(false);

    const result = await useCase.execute(n);

    expect(result).toBeNull();
    expect(mockNotifRepo.create).not.toHaveBeenCalled();
  });
});
