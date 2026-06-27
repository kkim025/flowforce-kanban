import { RevokeShareUseCase } from '../../../../src/modules/board-sharing/application/use-cases/revoke-share.use-case';
import { BoardSharingService } from '../../../../src/modules/board-sharing/board-sharing.service';
import { PermissionService } from '../../../../src/modules/board-sharing/permission.service';
import { IBoardSharingRepository } from '../../../../src/modules/board-sharing/domain/board-sharing.repository.interface';
import { BoardShare } from '../../../../src/modules/board-sharing/domain/board-share.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockRepo = {
  findShareById: jest.fn(),
} as unknown as jest.Mocked<IBoardSharingRepository>;

const mockSharingService = {
  revokeShare: jest.fn(),
} as unknown as jest.Mocked<BoardSharingService>;

const mockPermissionService = {
  enforceAdminBoard: jest.fn(),
} as unknown as jest.Mocked<PermissionService>;

describe('RevokeShareUseCase', () => {
  let useCase: RevokeShareUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new RevokeShareUseCase(
      mockSharingService as any,
      mockPermissionService as any,
      mockRepo as any,
    );
  });

  const makeShare = (boardId: string) =>
    BoardShare.create(
      {
        boardId,
        email: 'alice@example.com',
        permissionLevel: 'VIEW',
        status: 'PENDING',
        invitedById: 'user-1',
        inviteToken: 'token-abc',
        tokenExpiresAt: new Date(Date.now() + 86400000),
        publicId: 'pub-1',
        createdAt: new Date(),
      },
      'share-1',
    ).getValue();

  it('enforces admin permission on the requester', async () => {
    mockRepo.findShareById.mockResolvedValue(makeShare('board-1'));
    await useCase.execute('share-1', 'board-1', 'user-admin');
    expect(mockPermissionService.enforceAdminBoard).toHaveBeenCalledWith(
      'user-admin',
      'board-1',
    );
  });

  // C1 IDOR guard: an admin of board A must NOT be able to revoke a
  // share that belongs to board B by passing boardA's id in the URL and
  // boardB's shareId. The use case must verify share.boardId ===
  // boardId before calling the service.
  it('refuses to revoke a share that does not belong to the board in the URL', async () => {
    mockRepo.findShareById.mockResolvedValue(makeShare('board-B'));

    await expect(
      useCase.execute('share-1', 'board-A', 'admin-of-A'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockSharingService.revokeShare).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when the share does not exist', async () => {
    mockRepo.findShareById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', 'board-1', 'admin-of-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mockSharingService.revokeShare).not.toHaveBeenCalled();
  });

  it('revokes a share when share.boardId matches the boardId from the URL', async () => {
    mockRepo.findShareById.mockResolvedValue(makeShare('board-1'));

    await useCase.execute('share-1', 'board-1', 'admin-of-1');

    expect(mockSharingService.revokeShare).toHaveBeenCalledWith('share-1');
  });
});
