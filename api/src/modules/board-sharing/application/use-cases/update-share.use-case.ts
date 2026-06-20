import { Injectable, BadRequestException } from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';
import { UpdateShareDto } from '../dto/update-share.dto';
import { ShareResponseDto } from '../dto/share-response.dto';
import type { IBoardSharingRepository } from '../../domain/board-sharing.repository.interface';

@Injectable()
export class UpdateShareUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
    private readonly repo: IBoardSharingRepository,
  ) {}

  async execute(
    shareId: string,
    boardId: string,
    dto: UpdateShareDto,
    requestingUserId: string,
  ): Promise<ShareResponseDto> {
    await this.permissionService.enforceAdminBoard(requestingUserId, boardId);

    const share = await this.repo.findShareById(shareId);
    if (!share) throw new BadRequestException('Share not found');
    if (share.boardId !== boardId) throw new BadRequestException('Share does not belong to this board');
    if (share.status !== 'PENDING') {
      throw new BadRequestException('Can only update pending shares');
    }

    if (dto.permissionLevel) {
      // Access internal props via getter — update by replacing with new entity
      const updated = await this.repo.findShareById(shareId);
      if (!updated) throw new BadRequestException('Share not found');
      // Mutate and re-persist
      (share as any).props.permissionLevel = dto.permissionLevel;
      await this.repo.saveShare(share);
    }

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
