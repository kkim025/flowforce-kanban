import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';
import type { IBoardSharingRepository } from '../../domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from '../../domain/board-sharing.repository.interface';

@Injectable()
export class RevokeShareUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
    @Inject(BOARD_SHARING_REPOSITORY)
    private readonly repo: IBoardSharingRepository,
  ) {}

  async execute(
    shareId: string,
    boardId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.permissionService.enforceAdminBoard(requestingUserId, boardId);

    // IDOR guard: load the share first and verify it belongs to the
    // board from the URL path. Without this, an admin of board A could
    // revoke a share for board B by passing boardB's shareId against
    // boardA's URL.
    const share = await this.repo.findShareById(shareId);
    if (!share) throw new NotFoundException('Invite not found');
    if (share.boardId !== boardId) {
      throw new BadRequestException('Share does not belong to this board');
    }

    await this.sharingService.revokeShare(shareId);
  }
}
