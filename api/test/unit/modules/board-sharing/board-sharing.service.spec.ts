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
  build: jest
    .fn()
    .mockReturnValue({ subject: 'Invite', text: 'text', html: '<p>html</p>' }),
};

const mockMailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

// Minimal Prisma mock that supports $transaction and the boardMember /
// boardShare / board / user collections we touch in the transactional
// accept path. The $transaction body is invoked with a tx object whose
// methods we forward to mocks we configure per-test.
type TxClient = {
  boardShare: { findUnique: jest.Mock; update: jest.Mock };
  boardMember: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function makeMockPrisma() {
  const tx: TxClient = {
    boardShare: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    },
    boardMember: {
      findUnique: jest.fn(),
      create: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
  return {
    board: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(async (fn: (client: TxClient) => Promise<unknown>) =>
      fn(tx),
    ),
    _tx: tx,
  };
}

const mockPrisma: ReturnType<typeof makeMockPrisma> = makeMockPrisma();

describe('BoardSharingService', () => {
  let service: BoardSharingService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset prisma tx mocks for each test.
    mockPrisma._tx.boardShare.findUnique.mockReset();
    mockPrisma._tx.boardShare.update.mockReset();
    mockPrisma._tx.boardShare.update.mockResolvedValue(undefined);
    mockPrisma._tx.boardMember.findUnique.mockReset();
    mockPrisma._tx.boardMember.create.mockReset();
    mockPrisma._tx.boardMember.create.mockResolvedValue(undefined);
    mockPrisma._tx.boardMember.update.mockReset();
    mockPrisma._tx.boardMember.update.mockResolvedValue(undefined);
    process.env.FRONTEND_URL = 'http://localhost:5173';
    service = new BoardSharingService(
      mockRepo,
      mockEmailBuilder as any,
      mockMailService as any,
      mockPrisma as any,
    );
  });

  const makeShare = (
    overrides: Partial<Parameters<typeof BoardShare.create>[0]> = {},
    id = 'share-1',
  ) =>
    BoardShare.create(
      {
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
      },
      id,
    ).getValue();

  describe('createShare', () => {
    it('creates a share and sends an invite email', async () => {
      mockRepo.findPendingShare.mockResolvedValue(null);

      const share = await service.createShare(
        'board-1',
        'alice@example.com',
        'VIEW',
        'user-1',
        'Bob',
        'My Board',
        'http://localhost:5173',
      );

      expect(share.boardId).toBe('board-1');
      expect(share.email).toBe('alice@example.com');
      expect(share.status).toBe('PENDING');
      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockMailService.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'alice@example.com' }),
      );
    });

    // I1: returning the same shape for "already pending" and "newly
    // created" so the caller cannot enumerate which emails already
    // have pending invites.
    it('returns the existing share when one is already pending (no error)', async () => {
      const existing = makeShare();
      mockRepo.findPendingShare.mockResolvedValue(existing);

      const share = await service.createShare(
        'board-1',
        'alice@example.com',
        'VIEW',
        'user-1',
        'Bob',
        'My Board',
        'http://localhost:5173',
      );

      expect(share).toBe(existing);
      // No new share saved and no new email sent.
      expect(mockRepo.saveShare).not.toHaveBeenCalled();
      expect(mockMailService.send).not.toHaveBeenCalled();
    });
  });

  describe('acceptShare', () => {
    it('creates a new BoardMember inside a transaction', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);
      mockPrisma._tx.boardShare.findUnique.mockResolvedValue({
        id: share.id,
        status: 'PENDING',
      });
      mockPrisma._tx.boardMember.findUnique.mockResolvedValue(null);

      const member = await service.acceptShare('token-abc', 'user-2');

      expect(member.boardId).toBe('board-1');
      expect(member.userId).toBe('user-2');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma._tx.boardMember.create).toHaveBeenCalled();
      expect(mockPrisma._tx.boardShare.update).toHaveBeenCalled();
      // The repo's saveShare/saveMember should NOT be called directly
      // — we go through the transaction to keep the writes atomic.
      expect(mockRepo.saveShare).not.toHaveBeenCalled();
      expect(mockRepo.saveMember).not.toHaveBeenCalled();
    });

    // I8: when a member already exists with a higher or equal role,
    // accept should mark the share accepted but NOT downgrade them.
    it('keeps the existing role when it is already at least as permissive (no downgrade)', async () => {
      const share = makeShare({ permissionLevel: 'VIEW' });
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);
      mockPrisma._tx.boardShare.findUnique.mockResolvedValue({
        id: share.id,
        status: 'PENDING',
      });
      mockPrisma._tx.boardMember.findUnique.mockResolvedValue({
        id: 'member-existing',
        boardId: 'board-1',
        userId: 'user-2',
        role: 'EDITOR',
        publicId: 'pub-existing',
        createdAt: new Date(),
      });

      const member = await service.acceptShare('token-abc', 'user-2');

      expect(member.role).toBe('EDITOR');
      expect(member.publicId).toBe('pub-existing');
      // Share is still marked accepted.
      expect(mockPrisma._tx.boardShare.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACCEPTED' }),
        }),
      );
      // Member row was NOT rewritten (we only save the share update).
      expect(mockPrisma._tx.boardMember.update).not.toHaveBeenCalled();
      expect(mockPrisma._tx.boardMember.create).not.toHaveBeenCalled();
    });

    // I8: incoming EDIT should promote an existing VIEWER to EDITOR.
    it('promotes the existing member when the incoming role is higher', async () => {
      const share = makeShare({ permissionLevel: 'EDIT' });
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);
      mockPrisma._tx.boardShare.findUnique.mockResolvedValue({
        id: share.id,
        status: 'PENDING',
      });
      mockPrisma._tx.boardMember.findUnique.mockResolvedValue({
        id: 'member-existing',
        boardId: 'board-1',
        userId: 'user-2',
        role: 'VIEWER',
        publicId: 'pub-existing',
        createdAt: new Date(),
      });

      const member = await service.acceptShare('token-abc', 'user-2');

      expect(member.role).toBe('EDITOR');
      expect(mockPrisma._tx.boardMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'member-existing' },
          data: expect.objectContaining({ role: 'EDITOR' }),
        }),
      );
    });

    it('throws if user email does not match share email', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'bob@example.com',
      } as any);

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow(
        'different email address',
      );
    });

    it('throws if invite not found', async () => {
      mockRepo.findShareByToken.mockResolvedValue(null);
      await expect(service.acceptShare('bad-token', 'user-2')).rejects.toThrow(
        'Invite not found',
      );
    });

    it('throws if invite expired', async () => {
      const share = makeShare({ tokenExpiresAt: new Date(Date.now() - 1000) });
      mockRepo.findShareByToken.mockResolvedValue(share);

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow(
        'expired',
      );
    });

    // C3: if the share was already accepted by the time the
    // transaction's re-read happens, the accept must fail.
    it('throws if the share is no longer PENDING inside the transaction', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);
      mockPrisma._tx.boardShare.findUnique.mockResolvedValue({
        id: share.id,
        status: 'ACCEPTED',
      });

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow(
        'no longer pending',
      );
      expect(mockPrisma._tx.boardMember.create).not.toHaveBeenCalled();
    });
  });

  describe('declineShare', () => {
    it('marks share as DECLINED when requester email matches share email', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);

      await service.declineShare('token-abc', 'user-2');

      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockRepo.saveShare.mock.calls[0][0].status).toBe('DECLINED');
    });

    // C2: a logged-in user with a different email must NOT be allowed
    // to decline someone else's invite.
    it('throws ForbiddenException when the requester email does not match', async () => {
      const share = makeShare();
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'mallory@example.com',
      } as any);

      await expect(service.declineShare('token-abc', 'user-2')).rejects.toThrow(
        'not allowed to decline',
      );
      expect(mockRepo.saveShare).not.toHaveBeenCalled();
    });

    it('compares emails case-insensitively', async () => {
      const share = makeShare({ email: 'ALICE@example.com' });
      mockRepo.findShareByToken.mockResolvedValue(share);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'alice@example.com',
      } as any);

      await service.declineShare('token-abc', 'user-2');
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
      await expect(service.revokeShare('share-1')).rejects.toThrow(
        'Invite not found',
      );
    });
  });

  describe('removeMember', () => {
    const member = BoardMember.create(
      {
        boardId: 'board-1',
        userId: 'member-user',
        role: 'VIEWER',
        publicId: 'pub-mem',
        createdAt: new Date(),
      },
      'member-1',
    ).getValue();

    it('allows board owner to remove another member', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
      } as any);
      mockRepo.findMemberById.mockResolvedValue(member);

      await service.removeMember('board-1', 'member-1', 'owner-user');

      expect(mockRepo.deleteMember).toHaveBeenCalledWith('member-1');
    });

    it('allows ADMIN member to remove another member', async () => {
      const adminMember = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'admin-user',
          role: 'ADMIN',
          publicId: 'pub-admin',
          createdAt: new Date(),
        },
        'admin-member-1',
      ).getValue();

      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'other-owner',
      } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(adminMember);
      mockRepo.findMemberById.mockResolvedValue(member);

      await service.removeMember('board-1', 'member-1', 'admin-user');

      expect(mockRepo.deleteMember).toHaveBeenCalledWith('member-1');
    });

    it('throws ForbiddenException for non-admin', async () => {
      const viewerMember = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'viewer-user',
          role: 'VIEWER',
          publicId: 'pub-view',
          createdAt: new Date(),
        },
        'viewer-member-1',
      ).getValue();

      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'other-owner',
      } as any);
      mockRepo.findMemberByBoardAndUser.mockResolvedValue(viewerMember);

      await expect(
        service.removeMember('board-1', 'member-1', 'viewer-user'),
      ).rejects.toThrow('Admin access required');
    });

    it('throws NotFoundException if member does not exist', async () => {
      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
      } as any);
      mockRepo.findMemberById.mockResolvedValue(null);

      await expect(
        service.removeMember('board-1', 'member-1', 'owner-user'),
      ).rejects.toThrow('Member not found');
    });

    it('throws NotFoundException if member belongs to different board', async () => {
      const otherBoardMember = BoardMember.create(
        {
          boardId: 'other-board',
          userId: 'member-user',
          role: 'VIEWER',
          publicId: 'pub-mem',
          createdAt: new Date(),
        },
        'member-other',
      ).getValue();

      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
      } as any);
      mockRepo.findMemberById.mockResolvedValue(otherBoardMember);

      await expect(
        service.removeMember('board-1', 'member-other', 'owner-user'),
      ).rejects.toThrow('Member not found');
    });

    // I9: a board owner (or admin) should not be able to remove
    // themselves — that would lock them out of the board.
    it('throws BadRequestException when the requester tries to remove themselves', async () => {
      const selfMember = BoardMember.create(
        {
          boardId: 'board-1',
          userId: 'owner-user',
          role: 'VIEWER',
          publicId: 'pub-self',
          createdAt: new Date(),
        },
        'self-member-1',
      ).getValue();

      mockPrisma.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-user',
      } as any);
      mockRepo.findMemberById.mockResolvedValue(selfMember);

      await expect(
        service.removeMember('board-1', 'self-member-1', 'owner-user'),
      ).rejects.toThrow('Cannot remove yourself');
      expect(mockRepo.deleteMember).not.toHaveBeenCalled();
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
