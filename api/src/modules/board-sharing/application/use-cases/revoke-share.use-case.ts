import { Injectable } from '@nestjs/common';
import { BoardSharingService } from '../../board-sharing.service';
import { PermissionService } from '../../permission.service';

@Injectable()
export class RevokeShareUseCase {
  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
  ) {}

  async execute(
    shareId: string,
    boardId: string,
    requestingUserId: string,
  ): Promise<void> {
    await this.permissionService.enforceAdminBoard(requestingUserId, boardId);
    await this.sharingService.revokeShare(shareId);
  }
}
