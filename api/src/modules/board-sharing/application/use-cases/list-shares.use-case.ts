import { Injectable } from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';
import { ShareResponseDto, MemberResponseDto } from '../dto/share-response.dto';

@Injectable()
export class ListSharesUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
  ) {}

  async listSharesForBoard(
    boardId: string,
    requestingUserId: string,
  ): Promise<ShareResponseDto[]> {
    await this.permissionService.enforceAdminBoard(requestingUserId, boardId);

    const shares = await this.sharingService.listSharesForBoard(boardId);
    return shares.map((share) => ({
      id: share.id,
      publicId: share.publicId,
      email: share.email,
      permissionLevel: share.permissionLevel,
      status: share.status,
      invitedById: share.invitedById,
      tokenExpiresAt: share.tokenExpiresAt.toISOString(),
      createdAt: share.id,
    }));
  }

  async listMembersForBoard(
    boardId: string,
    requestingUserId: string,
  ): Promise<MemberResponseDto[]> {
    await this.permissionService.enforceViewBoard(requestingUserId, boardId);

    const members = await this.sharingService.listMembersForBoard(boardId);
    return members.map((m) => ({
      id: m.id,
      publicId: m.publicId,
      boardId: m.boardId,
      userId: m.userId,
      role: m.role,
      createdAt: m.id,
    }));
  }
}
