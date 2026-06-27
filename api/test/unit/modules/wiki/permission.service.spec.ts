import { WikiPermissionService } from '../../../../src/modules/wiki/permission.service';
import type { PrismaService } from '../../../../src/common/prisma/prisma.service';
import type { IBoardSharingRepository } from '../../../../src/modules/board-sharing/domain/board-sharing.repository.interface';
import { BoardMember } from '../../../../src/modules/board-sharing/domain/board-member.entity';

const mockPrisma = {
  board: { findUnique: jest.fn() },
} as unknown as jest.Mocked<PrismaService>;

const mockRepo = {
  findMemberByBoardAndUser: jest.fn(),
} as unknown as jest.Mocked<IBoardSharingRepository>;

describe('WikiPermissionService', () => {
  let service: WikiPermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WikiPermissionService(mockPrisma, mockRepo);
  });

  describe('enforceViewBoard', () => {
    it('allows board owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'user-1',
      } as any);
      await expect(
        service.enforceViewBoard('user-1', 'board-1'),
      ).resolves.toBeUndefined();
    });

    it('allows VIEWER member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      const m = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'user-1',
          role: 'VIEWER',
          publicId: 'pub',
        },
        'member-1',
      ).getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(m);
      await expect(
        service.enforceViewBoard('user-1', 'board-1'),
      ).resolves.toBeUndefined();
    });

    it('rejects non-member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(null);
      await expect(
        service.enforceViewBoard('user-1', 'board-1'),
      ).rejects.toThrow();
    });
  });

  describe('enforceEditBoard', () => {
    it('rejects VIEWER member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      const m = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'user-1',
          role: 'VIEWER',
          publicId: 'pub',
        },
        'member-1',
      ).getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(m);
      await expect(
        service.enforceEditBoard('user-1', 'board-1'),
      ).rejects.toThrow();
    });

    it('allows EDITOR member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      const m = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'user-1',
          role: 'EDITOR',
          publicId: 'pub',
        },
        'member-1',
      ).getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(m);
      await expect(
        service.enforceEditBoard('user-1', 'board-1'),
      ).resolves.toBeUndefined();
    });
  });

  describe('enforceAdminBoard', () => {
    it('rejects EDITOR member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      const m = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'user-1',
          role: 'EDITOR',
          publicId: 'pub',
        },
        'member-1',
      ).getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(m);
      await expect(
        service.enforceAdminBoard('user-1', 'board-1'),
      ).rejects.toThrow();
    });

    it('allows ADMIN member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'other',
      } as any);
      const m = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'user-1',
          role: 'ADMIN',
          publicId: 'pub',
        },
        'member-1',
      ).getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(m);
      await expect(
        service.enforceAdminBoard('user-1', 'board-1'),
      ).resolves.toBeUndefined();
    });

    it('allows board owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        ownerId: 'user-1',
      } as any);
      await expect(
        service.enforceAdminBoard('user-1', 'board-1'),
      ).resolves.toBeUndefined();
    });
  });
});
