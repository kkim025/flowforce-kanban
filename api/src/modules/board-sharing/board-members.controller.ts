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
import { ListSharesUseCase } from './application/use-cases/list-shares.use-case';
import { BoardSharingService } from './board-sharing.service';

@Controller('boards/:boardId/members')
@UseGuards(JwtAuthGuard)
export class BoardMembersController {
  private readonly logger = new Logger(BoardMembersController.name);

  constructor(
    private readonly listSharesUseCase: ListSharesUseCase,
    private readonly sharingService: BoardSharingService,
  ) {}

  @Get()
  async listMembers(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.listSharesUseCase.listMembersForBoard(boardId, userId);
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
