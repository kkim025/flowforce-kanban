import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('Notification entity', () => {
  const validProps = {
    recipientId: 'user-recipient',
    actorId: 'user-actor',
    type: NotificationType.ASSIGNMENT,
    title: 'Alice assigned you "Fix bug"',
    refType: 'task' as NotificationRefType,
    refId: 'task-1',
  };

  describe('create', () => {
    it('returns Result.ok with a Notification when props are valid', () => {
      const result = Notification.create(validProps);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeInstanceOf(Notification);
    });

    it('exposes all props as getters', () => {
      const n = Notification.create(validProps).getValue();
      expect(n.recipientId).toBe('user-recipient');
      expect(n.actorId).toBe('user-actor');
      expect(n.type).toBe(NotificationType.ASSIGNMENT);
      expect(n.title).toBe('Alice assigned you "Fix bug"');
      expect(n.refType).toBe('task');
      expect(n.refId).toBe('task-1');
    });

    it('accepts a server-supplied id', () => {
      const n = Notification.create(validProps, 'notif-1').getValue();
      expect(n.id).toBe('notif-1');
    });

    it('accepts optional boardId and milestone', () => {
      const n = Notification.create({
        ...validProps,
        boardId: 'board-1',
        milestone: '24h',
      }).getValue();
      expect(n.boardId).toBe('board-1');
      expect(n.milestone).toBe('24h');
    });

    it('returns Result.fail when recipientId is empty', () => {
      const result = Notification.create({ ...validProps, recipientId: '' });
      expect(result.isFailure).toBe(true);
    });

    it('returns Result.fail when title is empty', () => {
      const result = Notification.create({ ...validProps, title: '' });
      expect(result.isFailure).toBe(true);
    });

    it('returns Result.fail when type is missing', () => {
      const result = Notification.create({
        ...validProps,
        type: undefined as any,
      });
      expect(result.isFailure).toBe(true);
    });

    it('returns Result.fail when refType is empty', () => {
      const result = Notification.create({ ...validProps, refType: '' as unknown as NotificationRefType });
      expect(result.isFailure).toBe(true);
    });

    it('returns Result.fail when refId is empty', () => {
      const result = Notification.create({ ...validProps, refId: '' });
      expect(result.isFailure).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('sets readAt to a Date', () => {
      const n = Notification.create(validProps).getValue();
      const before = new Date();
      n.markAsRead();
      expect(n.readAt).toBeInstanceOf(Date);
      expect((n.readAt as Date).getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('accepts an explicit readAt date', () => {
      const n = Notification.create(validProps).getValue();
      const explicit = new Date('2026-06-12T10:00:00Z');
      n.markAsRead(explicit);
      expect(n.readAt).toEqual(explicit);
    });
  });

  describe('isUnread', () => {
    it('returns true when readAt is undefined', () => {
      const n = Notification.create(validProps).getValue();
      expect(n.isUnread()).toBe(true);
    });

    it('returns false after markAsRead', () => {
      const n = Notification.create(validProps).getValue();
      n.markAsRead();
      expect(n.isUnread()).toBe(false);
    });
  });
});
