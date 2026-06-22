import { BoardSharingService } from '../../../../src/modules/board-sharing/board-sharing.service';
import { IBoardSharingRepository } from '../../../../src/modules/board-sharing/domain/board-sharing.repository.interface';
import { BoardShare } from '../../../../src/modules/board-sharing/domain/board-share.entity';
import { BoardMember } from '../../../../src/modules/board-sharing/domain/board-member.entity';

const mockRepo = {
  findShareByToken: jest.fn(),
  findShareById: jest.fn(),
  findSharesByBoardId: jest.fn(),
  findSharesByEmail: jest.fn(),
  findPendingShare: jest.fn(),
  saveShare: jest.fn(),
  deleteShare: jest.fn(),
  findMemberById: jest.fn(),
  findMemberByBoardAndUser: jest.fn(),
  findMembersByBoardId: jest.fn(),
  findMembersByUserId: jest.fn(),
  saveMember: jest.fn(),
  deleteMember: jest.fn(),
} as unknown as jest.Mocked<IBoardSharingRepository>;

const mockEmailBuilder = {
  build: jest.fn().mockReturnValue({ subject: 'Invite', text: 'text', html: '<p>html</p>' }),
};

const mockMailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

const mockPrisma = {
  board: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

describe('BoardSharingService', () => {
  let service: BoardSharingService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'http://localhost:5173';
    service = new BoardSharingService(
      mockRepo,
      mockEmailBuilder as any,
      mockMailService as any,
      mockPrisma as any,
    );
  });

  const makeShare = (overrides: Partial<Parameters<typeof BoardShare.create>[0]> = {}) =>
    BoardShare.create({
      boardId: 'board-1',
      email: 'alice@example.com',
      permissionLevel: 'VIEW',
      status: 'PENDING',
      invitedById: 'user-1',
      inviteToken: 'token-abc',
      tokenExpiresAt: new Date(Date.now() + 86400000),
      publicId: 'pub-1',
      createdAt: new Date(),
      ...overrides,
    }, 'share-1').getValue();

  describe('createShare', () => {
    beforeEach(() => {
      process.env.FRONTEND_URL = 'http://localhost:5173';
    });

    it('creates a share and sends an invite email', async () => {
      mockRepo.findPendingShare.mockResolvedValue(null);

      const share = await service.createShare(
        'board-1', 'alice@example.com', 'VIEW',
        'user-1', 'Bob', 'My Board',
      );

      expect(share.boardId).toBe('board-1');
      expect(share.email).toBe('alice@example.com');
      expect(share.status).toBe('PENDING');
      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@example.com' }),
      );
    });

    it('throws if a pending share already exists', async () => {
      mockRepo.findPendingShare.mockResolvedValue(makeShare());

      await expect(
        service.createShare('board-1', 'alice@example.com', 'VIEW', 'user-1', 'Bob', 'My Board'),
      ).rejects.toThrow('pending invite already exists');
    });

;
  });

  describe('acceptShare', () => {
    it('creates BoardMember when user email matches share email', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'alice@example.com' } as any);

      const member = await service.acceptShare('token-abc', 'user-2');

      expect(member.boardId).toBe('board-1');
      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockRepo.saveMember).toHaveBeenCalled();
    });

    it('throws if user email does not match share email', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2', email: 'bob@example.com' } as any);

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow('different email address');
    });

    it('throws if invite not found', async () => {
      mockRepo.findShareByToken.mockResolvedValue(null);
      await expect(service.acceptShare('bad-token', 'user-2')).rejects.toThrow('Invite not found');
    });

    it('throws if invite expired', async () => {
      const share = makeShare({ tokenExpiresAt: new Date(Date.now() - 1000) });
      mockRepo.findShareByToken.mockResolvedValue(share);

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow('expired');
    });
  });

  describe('declineShare', () => {
    it('marks share as DECLINED', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);

      await service.declineShare('token-abc');

      expect(mockRepo.saveShare).toHaveBeenCalled();
    });
  });

  describe('revokeShare', () => {
    it('revokes a share when called', async () => {
      const share = makeShare();
      mockRepo.findShareById.mockResolvedValue(share);

      await service.revokeShare('share-1');

      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockRepo.saveShare.mock.calls[0][0].status).toBe('REVOKED');
    });

    it('throws if share not found', async () => {
      mockRepo.findShareById.mockResolvedValue(null);
      await expect(service.revokeShare('share-1')).rejects.toThrow('Invite not found');
    });
  });

  describe('removeMember', () => {
    const member = BoardMember.create({
      boardId: 'board-1', userId: 'member-user', role: 'VIEWER', publicId: 'pub-mem',
    }, 'member-1').getValue();

    it('allows board owner to remove any member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'owner-user' } as any);
      mockRepo.findMemberById.mockResolvedValue(member);

      await service.removeMember('board-1', 'member-1', 'owner-user');

      expect(mockRepo.deleteMember).toHaveBeenCalledWith('member-1');
    });

    it('allows ADMIN member to remove another member', async () => {
      const adminMember = BoardMember.create({
        boardId: 'board-1', userId: 'admin-user', role: 'ADMIN', publicId: 'pub-admin',
      }, 'admin-member-1').getValue();

      mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'other-owner' } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(adminMember);
      mockRepo.findMemberById.mockResolvedValue(member);

      await service.removeMember('board-1', 'member-1', 'admin-user');

      expect(mockRepo.deleteMember).toHaveBeenCalledWith('member-1');
    });

    it('throws ForbiddenException for non-admin', async () => {
      const viewerMember = BoardMember.create({
        boardId: 'board-1', userId: 'viewer-user', role: 'VIEWER', publicId: 'pub-view',
      }, 'viewer-member-1').getValue();

      mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'other-owner' } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(viewerMember);

      await expect(service.removeMember('board-1', 'member-1', 'viewer-user'))
        .rejects.toThrow('Admin access required');
    });

    it('throws NotFoundException if member does not exist', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'owner-user' } as any);
      mockRepo.findMemberById.mockResolvedValue(null);

      await expect(service.removeMember('board-1', 'member-1', 'owner-user'))
        .rejects.toThrow('Member not found');
    });

    it('throws NotFoundException if member belongs to different board', async () => {
      const otherBoardMember = BoardMember.create({
        boardId: 'other-board', userId: 'member-user', role: 'VIEWER', publicId: 'pub-mem',
      }, 'member-other').getValue();

      mockPrisma.board.findUnique.mockResolvedValue({ id: 'board-1', ownerId: 'owner-user' } as any);
      mockRepo.findMemberById.mockResolvedValue(otherBoardMember);

      await expect(service.removeMember('board-1', 'member-other', 'owner-user'))
        .rejects.toThrow('Member not found');
    });
  });

  describe('listSharesForBoard / listMembersForBoard', () => {
    it('delegates to repository', async () => {
      mockRepo.findSharesByBoardId.mockResolvedValue([]);
      mockRepo.findMembersByBoardId.mockResolvedValue([]);

      await service.listSharesForBoard('board-1');
      await service.listMembersForBoard('board-1');

      expect(mockRepo.findSharesByBoardId).toHaveBeenCalledWith('board-1');
      expect(mockRepo.findMembersByBoardId).toHaveBeenCalledWith('board-1');
    });
  });
});
