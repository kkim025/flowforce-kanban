import { Prisma } from '@prisma/client';
import { BoardShare, BoardShareStatus } from './board-share.entity';
import { BoardMember } from './board-member.entity';

export const BOARD_SHARING_REPOSITORY = 'BOARD_SHARING_REPOSITORY';

export interface IBoardSharingRepository {
  // BoardShare operations
  findShareByToken(token: string): Promise<BoardShare | null>;
  findShareById(id: string): Promise<BoardShare | null>;
  findSharesByBoardId(
    boardId: string,
    status?: BoardShareStatus,
  ): Promise<BoardShare[]>;
  findSharesByEmail(
    email: string,
    status?: BoardShareStatus,
  ): Promise<BoardShare[]>;
  findPendingShare(boardId: string, email: string): Promise<BoardShare | null>;
  saveShare(share: BoardShare, tx?: Prisma.TransactionClient): Promise<void>;
  deleteShare(id: string): Promise<void>;

  // BoardMember operations
  findMemberById(memberId: string): Promise<BoardMember | null>;
  findMemberByBoardAndUser(
    boardId: string,
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BoardMember | null>;
  findMembersByBoardId(boardId: string): Promise<BoardMember[]>;
  findMembersByUserId(userId: string): Promise<BoardMember[]>;
  saveMember(member: BoardMember, tx?: Prisma.TransactionClient): Promise<void>;
  deleteMember(id: string): Promise<void>;
}
