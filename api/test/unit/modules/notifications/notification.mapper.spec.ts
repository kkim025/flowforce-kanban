import {
  Notification as PrismaNotification,
  NotificationType as PrismaNotificationType,
  User as PrismaUser,
} from '@prisma/client';
import { NotificationMapper } from 'src/modules/notifications/infrastructure/persistence/notification.mapper';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('NotificationMapper', () => {
  const baseRaw: PrismaNotification = {
    id: 'notif-1',
    recipientId: 'user-1',
    actorId: 'user-2',
    type: PrismaNotificationType.ASSIGNMENT,
    title: 'Alice assigned you "Fix bug"',
    body: null,
    refType: 'task',
    refId: 'task-1',
    boardId: 'board-1',
    milestone: null,
    readAt: null,
    createdAt: new Date('2026-06-12T10:00:00Z'),
  };

  describe('toDomain', () => {
    it('maps a raw Prisma notification to a domain Notification', () => {
      const domain = NotificationMapper.toDomain(baseRaw);
      expect(domain).toBeInstanceOf(Notification);
      expect(domain.id).toBe('notif-1');
      expect(domain.recipientId).toBe('user-1');
      expect(domain.actorId).toBe('user-2');
      expect(domain.type).toBe(NotificationType.ASSIGNMENT);
      expect(domain.title).toBe('Alice assigned you "Fix bug"');
      expect(domain.body).toBeUndefined();
      expect(domain.refType).toBe('task');
      expect(domain.refId).toBe('task-1');
      expect(domain.boardId).toBe('board-1');
      expect(domain.milestone).toBeUndefined();
      expect(domain.readAt).toBeUndefined();
      expect(domain.createdAt).toEqual(new Date('2026-06-12T10:00:00Z'));
    });

    it('maps a read notification (readAt is set)', () => {
      const readAt = new Date('2026-06-12T11:00:00Z');
      const domain = NotificationMapper.toDomain({ ...baseRaw, readAt });
      expect(domain.readAt).toEqual(readAt);
      expect(domain.isUnread()).toBe(false);
    });

    it('maps a notification with milestone and body', () => {
      const domain = NotificationMapper.toDomain({
        ...baseRaw,
        type: PrismaNotificationType.DUE_DATE,
        milestone: '24h',
        body: 'Due in 24 hours',
      });
      expect(domain.type).toBe(NotificationType.DUE_DATE);
      expect(domain.milestone).toBe('24h');
      expect(domain.body).toBe('Due in 24 hours');
    });

    it('handles a null actorId', () => {
      const domain = NotificationMapper.toDomain({ ...baseRaw, actorId: null });
      expect(domain.actorId).toBeUndefined();
    });

    it('attaches the actor name when included via Prisma relation', () => {
      const actor: PrismaUser = {
        id: 'user-2',
        email: 'alice@example.com',
        password: 'x',
        name: 'Alice',
        role: 'MEMBER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const domain = NotificationMapper.toDomain({ ...baseRaw, actor });
      expect(domain.actorName).toBe('Alice');
    });
  });

  describe('toPersistence', () => {
    it('maps a domain Notification back to a Prisma-shaped object', () => {
      const domain = Notification.create({
        recipientId: 'user-1',
        actorId: 'user-2',
        type: NotificationType.MENTION,
        title: 'Bob mentioned you',
        refType: 'task',
        refId: 'task-2',
      }).getValue();

      const persistence = NotificationMapper.toPersistence(domain);
      expect(persistence.recipientId).toBe('user-1');
      expect(persistence.actorId).toBe('user-2');
      expect(persistence.type).toBe(PrismaNotificationType.MENTION);
      expect(persistence.title).toBe('Bob mentioned you');
      expect(persistence.refType).toBe('task');
      expect(persistence.refId).toBe('task-2');
      // id is provided by Prisma when omitted, but if we set one on the domain, pass it through
      expect(persistence.id).toBe(domain.id);
    });

    it('round-trips through toDomain → toPersistence', () => {
      const persistence = NotificationMapper.toPersistence(
        NotificationMapper.toDomain(baseRaw),
      );
      expect(persistence.id).toBe(baseRaw.id);
      expect(persistence.recipientId).toBe(baseRaw.recipientId);
      expect(persistence.type).toBe(baseRaw.type);
      expect(persistence.title).toBe(baseRaw.title);
      expect(persistence.refType).toBe(baseRaw.refType);
      expect(persistence.refId).toBe(baseRaw.refId);
      expect(persistence.boardId).toBe(baseRaw.boardId);
    });
  });
});
