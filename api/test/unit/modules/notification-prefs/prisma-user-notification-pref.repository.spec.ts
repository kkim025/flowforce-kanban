import { PrismaService } from 'src/common/prisma/prisma.service';
import { PrismaUserNotificationPrefRepository } from 'src/modules/notification-prefs/infrastructure/persistence/prisma-user-notification-pref.repository';
import { NotificationType } from 'src/modules/notifications/domain/notification.entity';

describe('PrismaUserNotificationPrefRepository', () => {
  let repo: PrismaUserNotificationPrefRepository;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      userNotificationPref: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };
    repo = new PrismaUserNotificationPrefRepository(
      mockPrisma as unknown as PrismaService,
    );
  });

  describe('listForUser', () => {
    it('returns all prefs for the user', async () => {
      mockPrisma.userNotificationPref.findMany.mockResolvedValue([
        {
          id: 'p1',
          userId: 'user-1',
          type: 'ASSIGNMENT',
          inAppEnabled: false,
        },
        {
          id: 'p2',
          userId: 'user-1',
          type: 'MENTION',
          inAppEnabled: true,
        },
      ]);
      const prefs = await repo.listForUser('user-1');
      expect(prefs).toHaveLength(2);
      expect(prefs[0].type).toBe(NotificationType.ASSIGNMENT);
      expect(prefs[0].inAppEnabled).toBe(false);
    });

    it('returns an empty array when the user has no explicit mutes', async () => {
      mockPrisma.userNotificationPref.findMany.mockResolvedValue([]);
      const prefs = await repo.listForUser('user-1');
      expect(prefs).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the pref when it exists', async () => {
      mockPrisma.userNotificationPref.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        type: 'ASSIGNMENT',
        inAppEnabled: false,
      });
      const pref = await repo.findOne('user-1', NotificationType.ASSIGNMENT);
      expect(pref).not.toBeNull();
      expect(pref!.inAppEnabled).toBe(false);
    });

    it('returns null when no pref exists for that type', async () => {
      mockPrisma.userNotificationPref.findUnique.mockResolvedValue(null);
      const pref = await repo.findOne('user-1', NotificationType.ASSIGNMENT);
      expect(pref).toBeNull();
    });
  });

  describe('isEnabled', () => {
    it('returns true when no row exists (most-permissive default)', async () => {
      mockPrisma.userNotificationPref.findUnique.mockResolvedValue(null);
      expect(await repo.isEnabled('user-1', NotificationType.ASSIGNMENT)).toBe(
        true,
      );
    });

    it('returns the stored inAppEnabled when a row exists', async () => {
      mockPrisma.userNotificationPref.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        type: 'ASSIGNMENT',
        inAppEnabled: false,
      });
      expect(await repo.isEnabled('user-1', NotificationType.ASSIGNMENT)).toBe(
        false,
      );
    });
  });

  describe('upsert', () => {
    it('upserts by (userId, type) and returns the entity', async () => {
      mockPrisma.userNotificationPref.upsert.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        type: 'MENTION',
        inAppEnabled: false,
      });
      const pref = await repo.upsert('user-1', NotificationType.MENTION, false);
      expect(pref.inAppEnabled).toBe(false);
      expect(mockPrisma.userNotificationPref.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_type: { userId: 'user-1', type: 'MENTION' } },
        }),
      );
    });
  });
});
