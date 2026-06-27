import { NotificationsListener } from 'src/modules/notifications/infrastructure/notifications.listener';
import { INotificationsEmitter } from 'src/modules/notifications/infrastructure/notifications.emitter';
import { CreateNotificationUseCase } from 'src/modules/notifications/application/use-cases/create-notification.use-case';
import { IUserNotificationPrefRepository } from 'src/modules/users/domain/user-notification-prefs.repository.interface';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('NotificationsListener', () => {
  let listener: NotificationsListener;
  let mockUseCase: jest.Mocked<CreateNotificationUseCase>;
  let mockEmitter: jest.Mocked<INotificationsEmitter>;
  let mockPrefRepo: jest.Mocked<IUserNotificationPrefRepository>;

  beforeEach(() => {
    mockUseCase = { execute: jest.fn() } as any;
    mockEmitter = { emitTo: jest.fn() } as any;
    mockPrefRepo = {
      listForUser: jest.fn(),
      findOne: jest.fn(),
      isEnabled: jest.fn(),
      upsert: jest.fn(),
    };
    listener = new NotificationsListener(
      mockUseCase,
      mockEmitter,
      mockPrefRepo,
    );
  });

  describe('task.assigned', () => {
    it('skips when newAssigneeId is null', async () => {
      await listener.handleTaskAssigned({
        taskId: 't1',
        prevAssigneeId: 'u1',
        newAssigneeId: null,
        actorId: 'u2',
        boardId: 'b1',
        taskContent: 'Fix bug',
      });
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('skips self-assignment (actor === newAssigneeId)', async () => {
      await listener.handleTaskAssigned({
        taskId: 't1',
        prevAssigneeId: null,
        newAssigneeId: 'u1',
        actorId: 'u1',
        boardId: 'b1',
        taskContent: 'Fix bug',
      });
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('skips when the type is muted', async () => {
      Notification.create({
        recipientId: 'u1',
        actorId: 'u2',
        type: NotificationType.ASSIGNMENT,
        title: 'Bob assigned you "Fix bug"',
        refType: 'task',
        refId: 't1',
        boardId: 'b1',
      });
      mockUseCase.execute.mockResolvedValue(null);

      await listener.handleTaskAssigned({
        taskId: 't1',
        prevAssigneeId: null,
        newAssigneeId: 'u1',
        actorId: 'u2',
        boardId: 'b1',
        taskContent: 'Fix bug',
      });

      expect(mockUseCase.execute).toHaveBeenCalled();
      // The use case returns null when muted — listener must not emit.
      expect(mockEmitter.emitTo).not.toHaveBeenCalled();
      // The notification ref is created in the listener and passed to use case.
      expect(mockUseCase.execute.mock.calls[0][0].type).toBe(
        NotificationType.ASSIGNMENT,
      );
    });

    it('persists and emits when the new assignee is not the actor and not muted', async () => {
      const n = Notification.create({
        recipientId: 'u1',
        actorId: 'u2',
        type: NotificationType.ASSIGNMENT,
        title: 'Bob assigned you "Fix bug"',
        refType: 'task',
        refId: 't1',
        boardId: 'b1',
      }).getValue();
      mockUseCase.execute.mockResolvedValue(n);

      await listener.handleTaskAssigned({
        taskId: 't1',
        prevAssigneeId: null,
        newAssigneeId: 'u1',
        actorId: 'u2',
        boardId: 'b1',
        taskContent: 'Fix bug',
      });

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'u1',
          actorId: 'u2',
          type: NotificationType.ASSIGNMENT,
          refType: 'task',
          refId: 't1',
          boardId: 'b1',
        }),
      );
      expect(mockEmitter.emitTo).toHaveBeenCalledWith('u1', n);
    });

    it('does not throw when the use case fails', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('boom'));
      await expect(
        listener.handleTaskAssigned({
          taskId: 't1',
          prevAssigneeId: null,
          newAssigneeId: 'u1',
          actorId: 'u2',
          boardId: 'b1',
          taskContent: 'Fix bug',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('comment.created', () => {
    it('creates one notification per mentioned user (skipping self)', async () => {
      const n1 = Notification.create({
        recipientId: 'u1',
        actorId: 'u2',
        type: NotificationType.MENTION,
        title: 'Bob mentioned you in "Fix bug"',
        refType: 'task',
        refId: 't1',
        boardId: 'b1',
      }).getValue();
      const n2 = Notification.create({
        recipientId: 'u3',
        actorId: 'u2',
        type: NotificationType.MENTION,
        title: 'Bob mentioned you in "Fix bug"',
        refType: 'task',
        refId: 't1',
        boardId: 'b1',
      }).getValue();
      mockUseCase.execute.mockResolvedValueOnce(n1).mockResolvedValueOnce(n2);

      await listener.handleCommentCreated({
        commentId: 'c1',
        taskId: 't1',
        actorId: 'u2',
        mentionedUserIds: ['u1', 'u2', 'u3'],
        boardId: 'b1',
        taskContent: 'Fix bug',
      });

      expect(mockUseCase.execute).toHaveBeenCalledTimes(2);
      expect(mockEmitter.emitTo).toHaveBeenCalledTimes(2);
      expect(mockEmitter.emitTo).toHaveBeenCalledWith('u1', n1);
      expect(mockEmitter.emitTo).toHaveBeenCalledWith('u3', n2);
    });

    it('does nothing when there are no mentioned users', async () => {
      await listener.handleCommentCreated({
        commentId: 'c1',
        taskId: 't1',
        actorId: 'u2',
        mentionedUserIds: [],
        boardId: 'b1',
        taskContent: 'Fix bug',
      });
      expect(mockUseCase.execute).not.toHaveBeenCalled();
      expect(mockEmitter.emitTo).not.toHaveBeenCalled();
    });

    it('does not throw when the use case fails for one user', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('boom'));
      await expect(
        listener.handleCommentCreated({
          commentId: 'c1',
          taskId: 't1',
          actorId: 'u2',
          mentionedUserIds: ['u1'],
          boardId: 'b1',
          taskContent: 'Fix bug',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('sprint.status_changed', () => {
    it('skips when recipientId === actorId', async () => {
      // For sprint status, the listener is given a recipientId (the board owner
      // or all active members). In v1 we only notify the actor's peers via
      // explicit list — but for this test, the listener receives a single
      // recipientId per emit. If the recipientId matches the actor, skip.
      await listener.handleSprintStatusChanged({
        sprintId: 's1',
        sprintName: 'Sprint 1',
        fromStatus: 'PLANNING',
        toStatus: 'ACTIVE',
        actorId: 'u1',
        boardId: 'b1',
        recipientId: 'u1',
      });
      expect(mockUseCase.execute).not.toHaveBeenCalled();
    });

    it('persists and emits when recipientId !== actorId', async () => {
      const n = Notification.create({
        recipientId: 'u2',
        actorId: 'u1',
        type: NotificationType.SPRINT_STATUS,
        title: 'Sprint "Sprint 1" is now ACTIVE',
        refType: 'sprint',
        refId: 's1',
        boardId: 'b1',
      }).getValue();
      mockUseCase.execute.mockResolvedValue(n);

      await listener.handleSprintStatusChanged({
        sprintId: 's1',
        sprintName: 'Sprint 1',
        fromStatus: 'PLANNING',
        toStatus: 'ACTIVE',
        actorId: 'u1',
        boardId: 'b1',
        recipientId: 'u2',
      });

      expect(mockUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'u2',
          actorId: 'u1',
          type: NotificationType.SPRINT_STATUS,
          refType: 'sprint',
          refId: 's1',
          boardId: 'b1',
        }),
      );
      expect(mockEmitter.emitTo).toHaveBeenCalledWith('u2', n);
    });

    it('does not throw when the use case fails', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('boom'));
      await expect(
        listener.handleSprintStatusChanged({
          sprintId: 's1',
          sprintName: 'Sprint 1',
          fromStatus: 'PLANNING',
          toStatus: 'ACTIVE',
          actorId: 'u1',
          boardId: 'b1',
          recipientId: 'u2',
        }),
      ).resolves.toBeUndefined();
    });
  });
});
