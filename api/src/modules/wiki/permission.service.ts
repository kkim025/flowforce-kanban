import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { IBoardSharingRepository } from '../board-sharing/domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from '../board-sharing/domain/board-sharing.repository.interface';

/**
 * Wiki permission model — mirrors the board ACL defined in
 * `board-sharing/permission.service.ts`. A user can read the wiki iff
 * they can read the board; they can edit iff they can edit the board;
 * they can hard-delete (and other destructive ops) iff they are board
 * admin.
 *
 * No wiki-only role in MVP.
 */
@Injectable()
export class WikiPermissionService {
  constructor(
    private readonly prisma: PrismaService,
    // We re-use the board sharing repo for membership lookups so the
    // ACL rules stay in one place. This avoids drift between the two
    // permission services.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Inject(BOARD_SHARING_REPOSITORY as any)
    // We type this as a minimal structural interface so we don't have
    // to import the full sharing repo type into this module's domain.
    private readonly sharingRepo: Pick<
      IBoardSharingRepository,
      'findMemberByBoardAndUser'
    >,
  ) {}

  private async isBoardAdmin(
    userId: string,
    boardId: string,
  ): Promise<boolean> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) return false;
    if (board.ownerId === userId) return true;
    const member = await this.sharingRepo.findMemberByBoardAndUser(
      boardId,
      userId,
    );
    return member?.isAdmin() ?? false;
  }

  private async canEditBoard(
    userId: string,
    boardId: string,
  ): Promise<boolean> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) return false;
    if (board.ownerId === userId) return true;
    const member = await this.sharingRepo.findMemberByBoardAndUser(
      boardId,
      userId,
    );
    return member?.canEdit() ?? false;
  }

  private async canViewBoard(
    userId: string,
    boardId: string,
  ): Promise<boolean> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) return false;
    if (board.ownerId === userId) return true;
    const member = await this.sharingRepo.findMemberByBoardAndUser(
      boardId,
      userId,
    );
    return member !== null;
  }

  /** VIEW board — required for any GET on the wiki. */
  async enforceViewBoard(userId: string, boardId: string): Promise<void> {
    if (!(await this.canViewBoard(userId, boardId))) {
      throw new ForbiddenException('You do not have access to this board');
    }
  }

  /** EDIT board — required for create / update / move / restore. */
  async enforceEditBoard(userId: string, boardId: string): Promise<void> {
    if (!(await this.canEditBoard(userId, boardId))) {
      throw new ForbiddenException(
        'You do not have permission to edit this board',
      );
    }
  }

  /** ADMIN board — required for hard-delete (and any future destructive op). */
  async enforceAdminBoard(userId: string, boardId: string): Promise<void> {
    if (!(await this.isBoardAdmin(userId, boardId))) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
