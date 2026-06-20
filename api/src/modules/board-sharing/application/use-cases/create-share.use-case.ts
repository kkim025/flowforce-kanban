import { Injectable } from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';
import { CreateShareDto } from '../dto/create-share.dto';
import { ShareResponseDto } from '../dto/share-response.dto';

@Injectable()
export class CreateShareUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
  ) {}

  async execute(
    dto: CreateShareDto,
    boardId: string,
    invitedById: string,
    inviterName: string,
    boardName: string,
    baseUrl = 'http://localhost:5173',
  ): Promise<ShareResponseDto> {
    await this.permissionService.enforceAdminBoard(invitedById, boardId);

    const share = await this.sharingService.createShare(
      boardId,
      dto.email,
      dto.permissionLevel,
      invitedById,
      inviterName,
      boardName,
      baseUrl,
    );

    return {
      id: share.id,
      publicId: share.publicId,
      email: share.email,
      permissionLevel: share.permissionLevel,
      status: share.status,
      invitedById: share.invitedById,
      tokenExpiresAt: share.tokenExpiresAt.toISOString(),
      createdAt: share.id,
    };
  }
}
