import { BoardSharingService } from '../../../../src/modules/board-sharing/board-sharing.service';
import { IBoardSharingRepository } from '../../../../src/modules/board-sharing/domain/board-sharing.repository.interface';
import { BoardShare, BoardShareStatus } from '../../../../src/modules/board-sharing/domain/board-share.entity';
import { BoardMember } from '../../../../src/modules/board-sharing/domain/board-member.entity';

const mockRepo = {
  findShareByToken: jest.fn(),
  findShareById: jest.fn(),
  findSharesByBoardId: jest.fn(),
  findSharesByEmail: jest.fn(),
  findPendingShare: jest.fn(),
  saveShare: jest.fn(),
  deleteShare: jest.fn(),
  findMemberByBoardAndUser: jest.fn(),
  findMembersByBoardId: jest.fn(),
  findMembersByUserId: jest.fn(),
  saveMember: jest.fn(),
  deleteMember: jest.fn(),
  deleteMembersByBoardId: jest.fn(),
} as unknown as jest.Mocked<IBoardSharingRepository>;

const mockEmailBuilder = {
  build: jest.fn().mockReturnValue({ subject: 'Invite', text: 'text', html: '<p>html</p>' }),
};

const mockMailService = {
  send: jest.fn().mockResolvedValue(undefined),
};

describe('BoardSharingService', () => {
  let service: BoardSharingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BoardSharingService(mockRepo, mockEmailBuilder as any, mockMailService as any);
  });

  describe('createShare', () => {
    it('creates a share and sends an invite email', async () => {
      mockRepo.findPendingShare.mockResolvedValue(null);

      const share = await service.createShare(
        'board-1', 'alice@example.com', 'VIEW',
        'user-1', 'Bob', 'My Board', 'http://localhost:5173',
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
      mockRepo.findPendingShare.mockResolvedValue({} as BoardShare);

      await expect(
        service.createShare('board-1', 'alice@example.com', 'VIEW', 'user-1', 'Bob', 'My Board', 'http://localhost:5173'),
      ).rejects.toThrow('pending invite already exists');
    });
  });

  describe('acceptShare', () => {
    it('creates BoardMember and marks share ACCEPTED', async () => {
      const share = BoardShare.create({
        boardId: 'board-1', email: 'alice@example.com', permissionLevel: 'VIEW',
        status: 'PENDING', invitedById: 'user-1',
        inviteToken: 'token-abc', tokenExpiresAt: new Date(Date.now() + 86400000),
        publicId: 'pub-1',
      }, 'share-1').getValue();

      mockRepo.findShareByToken.mockResolvedValue(share);

      const member = await service.acceptShare('token-abc', 'user-2');

      expect(member.boardId).toBe('board-1');
      expect(mockRepo.saveShare).toHaveBeenCalled();
      expect(mockRepo.saveMember).toHaveBeenCalled();
    });

    it('throws if invite not found', async () => {
      mockRepo.findShareByToken.mockResolvedValue(null);
      await expect(service.acceptShare('bad-token', 'user-2')).rejects.toThrow('Invite not found');
    });

    it('throws if invite expired', async () => {
      const share = BoardShare.create({
        boardId: 'board-1', email: 'alice@example.com', permissionLevel: 'VIEW',
        status: 'PENDING', invitedById: 'user-1',
        inviteToken: 'token-abc', tokenExpiresAt: new Date(Date.now() - 1000),
        publicId: 'pub-1',
      }, 'share-1').getValue();

      mockRepo.findShareByToken.mockResolvedValue(share);

      await expect(service.acceptShare('token-abc', 'user-2')).rejects.toThrow('expired');
    });
  });

  describe('declineShare', () => {
    it('marks share as DECLINED', async () => {
      const share = BoardShare.create({
        boardId: 'board-1', email: 'alice@example.com', permissionLevel: 'VIEW',
        status: 'PENDING', invitedById: 'user-1',
        inviteToken: 'token-abc', tokenExpiresAt: new Date(Date.now() + 86400000),
        publicId: 'pub-1',
      }, 'share-1').getValue();

      mockRepo.findShareByToken.mockResolvedValue(share);

      await service.declineShare('token-abc');

      expect(mockRepo.saveShare).toHaveBeenCalled();
    });
  });

  describe('revokeShare', () => {
    it('only allows the inviter to revoke', async () => {
      const share = BoardShare.create({
        boardId: 'board-1', email: 'alice@example.com', permissionLevel: 'VIEW',
        status: 'PENDING', invitedById: 'user-1',
        inviteToken: 'token-abc', tokenExpiresAt: new Date(Date.now() + 86400000),
        publicId: 'pub-1',
      }, 'share-1').getValue();

      mockRepo.findShareById.mockResolvedValue(share);

      await expect(service.revokeShare('share-1', 'other-user')).rejects.toThrow('Only the inviter');
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
