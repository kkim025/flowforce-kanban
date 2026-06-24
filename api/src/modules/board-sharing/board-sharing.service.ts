import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { IBoardSharingRepository } from './domain/board-sharing.repository.interface';
import { BOARD_SHARING_REPOSITORY } from './domain/board-sharing.repository.interface';
import { BoardShare } from './domain/board-share.entity';
import { BoardMember, BoardMemberRole } from './domain/board-member.entity';
import { InviteEmailBuilder } from '../../mail/templates/invite-email.builder';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../common/prisma/prisma.service';

const TOKEN_EXPIRY_HOURS = 72; // 3 days

// Role ordering for I8 — when an invite is accepted by someone who is
// already a member, keep the higher of the two roles. This avoids
// silently downgrading an existing ADMIN to VIEWER via a stale invite.
const ROLE_RANK: Record<BoardMemberRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  ADMIN: 3,
};

function roleAtLeast(
  existing: BoardMemberRole,
  incoming: BoardMemberRole,
): boolean {
  return ROLE_RANK[existing] >= ROLE_RANK[incoming];
}

@Injectable()
export class BoardSharingService {
  constructor(
    @Inject(BOARD_SHARING_REPOSITORY)
    private readonly repo: IBoardSharingRepository,
    private readonly emailBuilder: InviteEmailBuilder,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async createShare(
    boardId: string,
    email: string,
    permissionLevel: 'VIEW' | 'EDIT',
    invitedById: string,
    inviterName: string,
    boardName: string,
    baseUrl: string,
  ): Promise<BoardShare> {
    // I1: do not leak whether a pending invite already exists. If one
    // does, return it as-is (caller can't tell the difference) instead
    // of throwing a different error. We deliberately do NOT send a new
    // invite email in that case — resending would itself leak the
    // existence of an existing invite to the caller.
    const existing = await this.repo.findPendingShare(boardId, email);
    if (existing) {
      return existing;
    }

    const inviteToken = uuidv4();
    const tokenExpiresAt = new Date(
      Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000,
    );

    const shareResult = BoardShare.create({
      boardId,
      email,
      permissionLevel,
      status: 'PENDING',
      invitedById,
      inviteToken,
      tokenExpiresAt,
      publicId: uuidv4(),
      createdAt: new Date(),
    });

    if (shareResult.isFailure) {
      throw new BadRequestException(String(shareResult.error));
    }

    const share = shareResult.getValue();
    await this.repo.saveShare(share);

    const acceptUrl = `${baseUrl}/invite/${inviteToken}`;
    const declineUrl = `${baseUrl}/invite/${inviteToken}/decline`;

    const { subject, text, html } = this.emailBuilder.build({
      inviterName,
      boardName,
      permissionLabel: permissionLevel === 'EDIT' ? 'edit' : 'view',
      acceptUrl,
      declineUrl,
      expiresAt: tokenExpiresAt,
    });

    await this.mailService.send({ to: email, subject, text, html });

    return share;
  }

  async acceptShare(token: string, userId: string): Promise<BoardMember> {
    const share = await this.repo.findShareByToken(token);
    if (!share) throw new NotFoundException('Invite not found');
    if (!share.isPending())
      throw new BadRequestException(
        `Invite is no longer pending (status: ${share.status})`,
      );
    if (share.isExpired()) throw new BadRequestException('Invite has expired');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.email.toLowerCase() !== share.email.toLowerCase()) {
      throw new BadRequestException(
        'This invite was sent to a different email address',
      );
    }

    const incomingRole: 'VIEWER' | 'EDITOR' =
      share.permissionLevel === 'EDIT' ? 'EDITOR' : 'VIEWER';

    // C3 + I8: perform the share-save and the member-save inside a single
    // transaction so a crash mid-way cannot leave a share accepted
    // without a corresponding member row. The transaction also
    // serialises the read-then-write of the member row, eliminating the
    // TOCTOU race where two concurrent accepts both pass the
    // "is pending" check and then both try to insert.
    const member: BoardMember = await this.prisma.$transaction(async (tx) => {
      // Re-read the share under the transaction to make sure it is
      // still PENDING. findUnique on a unique token is safe.
      const liveShare = await tx.boardShare.findUnique({
        where: { inviteToken: token },
      });
      if (!liveShare || liveShare.status !== 'PENDING') {
        throw new BadRequestException('Invite is no longer pending');
      }

      const existingMember = await tx.boardMember.findUnique({
        where: { boardId_userId: { boardId: share.boardId, userId } },
      });

      // I8: if the user is already a member, keep the higher of the
      // existing and incoming roles. We never silently downgrade.
      // The share is still marked ACCEPTED so it can't be reused.
      share.accept();

      if (existingMember) {
        if (roleAtLeast(existingMember.role as BoardMemberRole, incomingRole)) {
          // Existing role is at least as permissive. Save the share
          // transition only, and return the existing member untouched.
          await tx.boardShare.update({
            where: { id: share.id },
            data: {
              status: share.status,
              acceptedAt: share.acceptedAt,
              updatedAt: new Date(),
            },
          });
          return BoardMember.create(
            {
              boardId: existingMember.boardId,
              userId: existingMember.userId,
              role: existingMember.role as BoardMemberRole,
              publicId: existingMember.publicId,
              createdAt: existingMember.createdAt,
            },
            existingMember.id,
          ).getValue();
        }

        // Incoming role is higher — promote the existing member.
        await tx.boardMember.update({
          where: { id: existingMember.id },
          data: { role: incomingRole, updatedAt: new Date() },
        });
        await tx.boardShare.update({
          where: { id: share.id },
          data: {
            status: share.status,
            acceptedAt: share.acceptedAt,
            updatedAt: new Date(),
          },
        });
        return BoardMember.create(
          {
            boardId: share.boardId,
            userId,
            role: incomingRole,
            publicId: existingMember.publicId,
            createdAt: existingMember.createdAt,
          },
          existingMember.id,
        ).getValue();
      }

      // No existing member — create one.
      const newMemberResult = BoardMember.create({
        boardId: share.boardId,
        userId,
        role: incomingRole,
        publicId: uuidv4(),
        createdAt: new Date(),
      });
      if (newMemberResult.isFailure) {
        throw new BadRequestException(String(newMemberResult.error));
      }
      const newMember = newMemberResult.getValue();
      await tx.boardMember.create({
        data: {
          id: newMember.id,
          boardId: newMember.boardId,
          userId: newMember.userId,
          role: newMember.role,
          publicId: newMember.publicId,
          updatedAt: new Date(),
        },
      });
      await tx.boardShare.update({
        where: { id: share.id },
        data: {
          status: share.status,
          acceptedAt: share.acceptedAt,
          updatedAt: new Date(),
        },
      });
      return newMember;
    });

    return member;
  }

  async declineShare(token: string, requestingUserId: string): Promise<void> {
    const share = await this.repo.findShareByToken(token);
    if (!share) throw new NotFoundException('Invite not found');
    if (!share.isPending())
      throw new BadRequestException(
        `Invite is no longer pending (status: ${share.status})`,
      );

    // C2: authorize the requester against the invite's email address.
    // Without this, any logged-in user could decline someone else's
    // invite by guessing the token.
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
    });
    if (!user || user.email.toLowerCase() !== share.email.toLowerCase()) {
      throw new ForbiddenException(
        'You are not allowed to decline this invite',
      );
    }

    share.decline();
    await this.repo.saveShare(share);
  }

  async revokeShare(shareId: string): Promise<void> {
    const share = await this.repo.findShareById(shareId);
    if (!share) throw new NotFoundException('Invite not found');
    share.revoke();
    await this.repo.saveShare(share);
  }

  async listSharesForBoard(boardId: string): Promise<BoardShare[]> {
    return this.repo.findSharesByBoardId(boardId);
  }

  async listPendingSharesForEmail(email: string): Promise<BoardShare[]> {
    return this.repo.findSharesByEmail(email.toLowerCase(), 'PENDING');
  }

  async listMembersForBoard(boardId: string): Promise<BoardMember[]> {
    return this.repo.findMembersByBoardId(boardId);
  }

  async listMembershipsForUser(userId: string): Promise<BoardMember[]> {
    return this.repo.findMembersByUserId(userId);
  }

  async removeMember(
    boardId: string,
    memberId: string,
    requestingUserId: string,
  ): Promise<void> {
    // Permission check: requester must be board admin
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException('Board not found');
    const isOwner = board.ownerId === requestingUserId;
    if (!isOwner) {
      const member = await this.repo.findMemberByBoardAndUser(
        boardId,
        requestingUserId,
      );
      if (!member || !member.isAdmin()) {
        throw new ForbiddenException('Admin access required');
      }
    }
    const target = await this.repo.findMemberById(memberId);
    if (!target) throw new NotFoundException('Member not found');
    if (target.boardId !== boardId)
      throw new NotFoundException('Member not found');
    // I9: do not let the requester remove themselves. This avoids the
    // owner accidentally locking themselves out of their own board.
    if (target.userId === requestingUserId) {
      throw new BadRequestException('Cannot remove yourself');
    }
    await this.repo.deleteMember(target.id);
  }
}
