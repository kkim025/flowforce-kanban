import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateShareUseCase } from './application/use-cases/create-share.use-case';
import { ListSharesUseCase } from './application/use-cases/list-shares.use-case';
import { RevokeShareUseCase } from './application/use-cases/revoke-share.use-case';
import { BoardSharingService } from './board-sharing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateShareDto } from './application/dto/create-share.dto';
import type { IBoardSharingRepository } from './domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from './domain/board-sharing.repository.interface';

// ── Board shares (admin) ─────────────────────────────────────────────────────

@Controller('boards/:boardId/shares')
@UseGuards(JwtAuthGuard)
export class BoardSharesController {
  private readonly logger = new Logger(BoardSharesController.name);

  constructor(
    private readonly createShareUseCase: CreateShareUseCase,
    private readonly listSharesUseCase: ListSharesUseCase,
    private readonly revokeShareUseCase: RevokeShareUseCase,
    private readonly sharingService: BoardSharingService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async createShare(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Body() dto: CreateShareDto,
  ) {
    this.logger.log(`Creating share for board ${boardId} invited by ${userId}`);

    const [inviter, board] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.board.findUnique({ where: { id: boardId } }),
    ]);

    if (!board) throw new NotFoundException('Board not found');
    const inviterName = inviter?.name ?? inviter?.email ?? 'A user';

    return this.createShareUseCase.execute(
      dto,
      boardId,
      userId,
      inviterName,
      board.title,
    );
  }

  @Get()
  async listShares(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.listSharesUseCase.listSharesForBoard(boardId, userId);
  }

  @Delete(':shareId')
  async revokeShare(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('shareId') shareId: string,
  ) {
    await this.revokeShareUseCase.execute(shareId, boardId, userId);
    return { success: true };
  }
}

// ── Public invite endpoints ───────────────────────────────────────────────────

@Controller('invites')
export class InviteAcceptController {
  private readonly logger = new Logger(InviteAcceptController.name);

  constructor(
    private readonly sharingService: BoardSharingService,
    private readonly prisma: PrismaService,
    @Inject(BOARD_SHARING_REPOSITORY)
    private readonly repo: IBoardSharingRepository,
  ) {}

  // Public — no auth required (user may not be logged in yet)
  @Get(':token')
  async getInvite(@Param('token') token: string) {
    const share = await this.repo.findShareByToken(token);
    if (!share) throw new NotFoundException('Invite not found');

    const board = await this.prisma.board.findUnique({
      where: { id: share.boardId },
    });
    return {
      token,
      email: share.email,
      permissionLevel: share.permissionLevel,
      status: share.status,
      expiresAt: share.tokenExpiresAt.toISOString(),
      boardName: board?.title ?? 'Unknown board',
      boardId: share.boardId,
    };
  }

  // Protected — requires JWT auth
  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  async acceptInvite(
    @Param('token') token: string,
    @GetUser('sub') userId: string,
  ) {
    this.logger.log(`User ${userId} accepting invite ${token}`);
    const member = await this.sharingService.acceptShare(token, userId);
    return { success: true, memberId: member.id, boardId: member.boardId };
  }

  // Protected — requires JWT auth
  @Post(':token/decline')
  @UseGuards(JwtAuthGuard)
  async declineInvite(
    @Param('token') token: string,
    @GetUser('sub') userId: string,
  ) {
    this.logger.log(`User ${userId} declining invite ${token}`);
    await this.sharingService.declineShare(token);
    return { success: true };
  }
}
