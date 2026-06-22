import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';
import { UpdateShareDto } from '../dto/update-share.dto';
import { ShareResponseDto } from '../dto/share-response.dto';
import type { IBoardSharingRepository } from '../../domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from '../../domain/board-sharing.repository.interface';

@Injectable()
export class UpdateShareUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
    @Inject(BOARD_SHARING_REPOSITORY) private readonly repo: IBoardSharingRepository,
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
      share.updatePermissionLevel(dto.permissionLevel);
      await this.repo.saveShare(share);
    }

    const saved = await this.repo.findShareById(share.id);
    return {
      id: saved!.id,
      publicId: saved!.publicId,
      email: saved!.email,
      permissionLevel: saved!.permissionLevel,
      status: saved!.status,
      invitedById: saved!.invitedById,
      tokenExpiresAt: saved!.tokenExpiresAt.toISOString(),
      createdAt: saved!.createdAt.toISOString(),
    };
  }
}
