import { Injectable, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { IBoardSharingRepository } from './domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from './domain/board-sharing.repository.interface';

@Injectable()
export class PermissionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOARD_SHARING_REPOSITORY) private readonly sharingRepo: IBoardSharingRepository,
  ) {}

  /**
   * Returns true if userId has at least VIEW access to boardId.
   * Owners and BoardMembers always have access.
   */
  async canViewBoard(userId: string, boardId: string): Promise<boolean> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return false;
    if (board.ownerId === userId) return true;

    const member = await this.sharingRepo.findMemberByBoardAndUser(boardId, userId);
    return member !== null;
  }

  /**
   * Returns true if userId has EDIT access to boardId.
   * Owners and EDITOR/ADMIN BoardMembers have access.
   */
  async canEditBoard(userId: string, boardId: string): Promise<boolean> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) return false;
    if (board.ownerId === userId) return true;

    const member = await this.sharingRepo.findMemberByBoardAndUser(boardId, userId);
    return member !== null && member.canEdit();
  }

  /**
   * Enforces VIEW access — throws ForbiddenException if denied.
   */
  async enforceViewBoard(userId: string, boardId: string): Promise<void> {
    if (!(await this.canViewBoard(userId, boardId))) {
      throw new ForbiddenException('You do not have access to this board');
    }
  }

  /**
   * Enforces EDIT access — throws ForbiddenException if denied.
   */
  async enforceEditBoard(userId: string, boardId: string): Promise<void> {
    if (!(await this.canEditBoard(userId, boardId))) {
      throw new ForbiddenException('You do not have permission to edit this board');
    }
  }

  /**
   * Enforces ADMIN-level access — throws ForbiddenException if denied.
   * Only board owners and ADMIN members pass.
   */
  async enforceAdminBoard(userId: string, boardId: string): Promise<void> {
    const board = await this.prisma.board.findUnique({ where: { id: boardId } });
    if (!board) throw new ForbiddenException('Board not found');
    if (board.ownerId === userId) return;

    const member = await this.sharingRepo.findMemberByBoardAndUser(boardId, userId);
    if (!member || !member.isAdmin()) {
      throw new ForbiddenException('Admin access required');
    }
  }
}
