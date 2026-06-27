import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaNotificationRepository } from 'src/modules/notifications/infrastructure/persistence/prisma-notification.repository';
import {
  Notification,
  NotificationType,
} from 'src/modules/notifications/domain/notification.entity';

describe('PrismaNotificationRepository', () => {
  let repo: PrismaNotificationRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    repo = new PrismaNotificationRepository(
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('create', () => {
    it('persists a notification and returns the domain entity', async () => {
      const n = Notification.create({
        recipientId: 'user-1',
        actorId: 'user-2',
        type: NotificationType.ASSIGNMENT,
        title: 'Alice assigned you "X"',
        refType: 'task',
        refId: 'task-1',
      }).getValue();

      mockPrisma.notification.create.mockResolvedValue({
        id: n.id,
        recipientId: 'user-1',
        actorId: 'user-2',
        type: 'ASSIGNMENT',
        title: 'Alice assigned you "X"',
        body: null,
        refType: 'task',
        refId: 'task-1',
        boardId: null,
        milestone: null,
        readAt: null,
        createdAt: new Date(),
      });

      const result = await repo.create(n);
      expect(result).toBeInstanceOf(Notification);
      expect(result.recipientId).toBe('user-1');
      expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findByIdForRecipient', () => {
    it('scopes the lookup to the recipientId', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-1',
        actorId: null,
        type: 'ASSIGNMENT',
        title: 'X',
        body: null,
        refType: 'task',
        refId: 'task-1',
        boardId: null,
        milestone: null,
        readAt: null,
        createdAt: new Date(),
      });
      const result = await repo.findByIdForRecipient('notif-1', 'user-1');
      expect(result).toBeInstanceOf(Notification);
      expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', recipientId: 'user-1' },
      });
    });

    it('returns null when not found for that recipient', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      const result = await repo.findByIdForRecipient('notif-1', 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('listForRecipient', () => {
    it('paginates with cursor and limit; nextCursor is the last id when full page', async () => {
      // Implementation uses the +1 sentinel pattern: it requests limit+1 rows
      // to know if a next page exists. We return 4 rows for limit=3 → hasMore=true.
      mockPrisma.notification.findMany.mockResolvedValue(
        Array.from({ length: 4 }, (_, i) => ({
          id: `notif-${i}`,
          recipientId: 'user-1',
          actorId: null,
          type: 'ASSIGNMENT',
          title: `t${i}`,
          body: null,
          refType: 'task',
          refId: `task-${i}`,
          boardId: null,
          milestone: null,
          readAt: null,
          createdAt: new Date(),
        })),
      );

      const result = await repo.listForRecipient('user-1', { limit: 3 });
      expect(result.items).toHaveLength(3);
      expect(result.nextCursor).toBe('notif-2');
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: 'user-1' },
          take: 4, // limit + 1 sentinel
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns nextCursor = null when fewer than limit+1 rows', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        {
          id: 'n1',
          recipientId: 'user-1',
          actorId: null,
          type: 'ASSIGNMENT',
          title: 't',
          body: null,
          refType: 'task',
          refId: 'task-1',
          boardId: null,
          milestone: null,
          readAt: null,
          createdAt: new Date(),
        },
      ]);
      const result = await repo.listForRecipient('user-1', { limit: 20 });
      expect(result.nextCursor).toBeNull();
    });

    it('filters by unreadOnly', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      await repo.listForRecipient('user-1', { unreadOnly: true });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { recipientId: 'user-1', readAt: null },
        }),
      );
    });

    it('honors a cursor by skipping one past it', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      await repo.listForRecipient('user-1', {
        limit: 20,
        cursor: 'notif-cursor',
      });
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'notif-cursor' },
        }),
      );
    });
  });

  describe('countUnreadForRecipient', () => {
    it('counts only unread notifications for the recipient', async () => {
      mockPrisma.notification.count.mockResolvedValue(7);
      const count = await repo.countUnreadForRecipient('user-1');
      expect(count).toBe(7);
      expect(mockPrisma.notification.count).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
      });
    });
  });

  describe('markRead', () => {
    it('updates only when the notification belongs to the recipient', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-1',
        actorId: null,
        type: 'ASSIGNMENT',
        title: 't',
        body: null,
        refType: 'task',
        refId: 'task-1',
        boardId: null,
        milestone: null,
        readAt: new Date(),
        createdAt: new Date(),
      });
      const result = await repo.markRead('notif-1', 'user-1');
      expect(result.readAt).toBeInstanceOf(Date);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', recipientId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });

    it('is idempotent — second call still returns the entity', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 }); // already read
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'user-1',
        actorId: null,
        type: 'ASSIGNMENT',
        title: 't',
        body: null,
        refType: 'task',
        refId: 'task-1',
        boardId: null,
        milestone: null,
        readAt: new Date(),
        createdAt: new Date(),
      });
      const result = await repo.markRead('notif-1', 'user-1');
      expect(result.readAt).toBeInstanceOf(Date);
    });

    it('throws NotFoundException if the notification does not exist for that recipient', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      await expect(repo.markRead('notif-x', 'user-1')).rejects.toThrow();
    });
  });

  describe('markAllReadForRecipient', () => {
    it('returns the number of updated rows', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
      const count = await repo.markAllReadForRecipient('user-1');
      expect(count).toBe(5);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });
});
