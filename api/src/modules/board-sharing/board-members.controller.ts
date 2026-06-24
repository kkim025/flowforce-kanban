import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { BoardSharingService } from './board-sharing.service';
import { PermissionService } from './permission.service';

// TODO(code-review-I7): see comment in board-shares.controller.ts —
// add @nestjs/throttler @Throttle decorators here too.

@Controller('boards/:boardId/members')
@UseGuards(JwtAuthGuard)
export class BoardMembersController {
  private readonly logger = new Logger(BoardMembersController.name);

  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly permissionService: PermissionService,
  ) {}

  @Get()
  async listMembers(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
  ) {
    await this.permissionService.enforceEditBoard(userId, boardId);
    return this.sharingService.listMembersForBoard(boardId);
  }

  @Delete(':memberId')
  async removeMember(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.sharingService.removeMember(boardId, memberId, userId);
    return { success: true };
  }
}
