import { PermissionService } from '../../../../src/modules/board-sharing/permission.service';
import { IBoardSharingRepository } from '../../../../src/modules/board-sharing/domain/board-sharing.repository.interface';
import { PrismaService } from '../../../../src/modules/common/prisma/prisma.service';
import { BoardMember } from '../../../../src/modules/board-sharing/domain/board-member.entity';

const mockPrisma = {
  board: {
    findUnique: jest.fn(),
  },
} as unknown as jest.Mocked<PrismaService>;

const mockRepo = {
  findMemberByBoardAndUser: jest.fn(),
} as unknown as jest.Mocked<IBoardSharingRepository>;

describe('PermissionService', () => {
  let service: PermissionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PermissionService(mockPrisma, mockRepo);
  });

  describe('canViewBoard', () => {
    it('returns true for board owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'user-1' } as any);
      const result = await service.canViewBoard('user-1', 'board-1');
      expect(result).toBe(true);
    });

    it('returns true for board member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      const member = BoardMember.create({
        boardId: 'board-1', userId: 'user-1', role: 'VIEWER', publicId: 'pub-1',
      }, 'member-1').getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(member);

      const result = await service.canViewBoard('user-1', 'board-1');
      expect(result).toBe(true);
    });

    it('returns false for non-member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(null);

      const result = await service.canViewBoard('user-1', 'board-1');
      expect(result).toBe(false);
    });

    it('returns false when board not found', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      const result = await service.canViewBoard('user-1', 'board-1');
      expect(result).toBe(false);
    });
  });

  describe('canEditBoard', () => {
    it('returns true for board owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'user-1' } as any);
      const result = await service.canEditBoard('user-1', 'board-1');
      expect(result).toBe(true);
    });

    it('returns true for EDITOR member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      const member = BoardMember.create({
        boardId: 'board-1', userId: 'user-1', role: 'EDITOR', publicId: 'pub-1',
      }, 'member-1').getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(member);

      const result = await service.canEditBoard('user-1', 'board-1');
      expect(result).toBe(true);
    });

    it('returns false for VIEWER member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      const member = BoardMember.create({
        boardId: 'board-1', userId: 'user-1', role: 'VIEWER', publicId: 'pub-1',
      }, 'member-1').getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(member);

      const result = await service.canEditBoard('user-1', 'board-1');
      expect(result).toBe(false);
    });
  });

  describe('enforceEditBoard', () => {
    it('throws ForbiddenException when no access', async () => {
      mockPrisma.board.findUnique.mockResolvedValue(null);
      await expect(service.enforceEditBoard('user-1', 'board-1')).rejects.toThrow();
    });
  });

  describe('enforceAdminBoard', () => {
    it('allows board owner', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'user-1' } as any);
      await expect(service.enforceAdminBoard('user-1', 'board-1')).resolves.toBeUndefined();
    });

    it('throws for non-admin member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      const member = BoardMember.create({
        boardId: 'board-1', userId: 'user-1', role: 'EDITOR', publicId: 'pub-1',
      }, 'member-1').getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(member);

      await expect(service.enforceAdminBoard('user-1', 'board-1')).rejects.toThrow();
    });

    it('allows ADMIN member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ ownerId: 'other' } as any);
      const member = BoardMember.create({
        boardId: 'board-1', userId: 'user-1', role: 'ADMIN', publicId: 'pub-1',
      }, 'member-1').getValue();
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(member);

      await expect(service.enforceAdminBoard('user-1', 'board-1')).resolves.toBeUndefined();
    });
  });
});
