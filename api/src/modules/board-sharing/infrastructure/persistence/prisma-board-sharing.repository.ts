import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IBoardSharingRepository } from '../../domain/board-sharing.repository.interface';
import { BoardShare, BoardShareStatus, PermissionLevel } from '../../domain/board-share.entity';
import { BoardMember, BoardMemberRole } from '../../domain/board-member.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaBoardSharingRepository implements IBoardSharingRepository {
  constructor(private prisma: PrismaService) {}

  // ── BoardShare ────────────────────────────────────────────────────────────────

  private rawToShare(raw: Prisma.BoardShareGetPayload<object>): BoardShare {
    const props = {
      boardId: raw.boardId,
      email: raw.email,
      permissionLevel: raw.permissionLevel as PermissionLevel,
      status: raw.status as BoardShareStatus,
      invitedById: raw.invitedById,
      inviteToken: raw.inviteToken,
      tokenExpiresAt: raw.tokenExpiresAt,
      acceptedAt: raw.acceptedAt ?? undefined,
      declinedAt: raw.declinedAt ?? undefined,
      revokedAt: raw.revokedAt ?? undefined,
      publicId: raw.publicId,
    };
    return BoardShare.create(props, raw.id).getValue();
  }

  async findShareByToken(token: string): Promise<BoardShare | null> {
    const raw = await this.prisma.boardShare.findUnique({ where: { inviteToken: token } });
    return raw ? this.rawToShare(raw) : null;
  }

  async findShareById(id: string): Promise<BoardShare | null> {
    const raw = await this.prisma.boardShare.findUnique({ where: { id } });
    return raw ? this.rawToShare(raw) : null;
  }

  async findSharesByBoardId(boardId: string, status?: BoardShareStatus): Promise<BoardShare[]> {
    const raws = await this.prisma.boardShare.findMany({
      where: { boardId, ...(status ? { status } : undefined) },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((r) => this.rawToShare(r));
  }

  async findSharesByEmail(email: string, status?: BoardShareStatus): Promise<BoardShare[]> {
    const raws = await this.prisma.boardShare.findMany({
      where: { email, ...(status ? { status } : undefined) },
      orderBy: { createdAt: 'desc' },
    });
    return raws.map((r) => this.rawToShare(r));
  }

  async findPendingShare(boardId: string, email: string): Promise<BoardShare | null> {
    const raw = await this.prisma.boardShare.findUnique({
      where: { boardId_email: { boardId, email } },
    });
    if (!raw || raw.status !== 'PENDING') return null;
    return this.rawToShare(raw);
  }

  async saveShare(share: BoardShare): Promise<void> {
    await this.prisma.boardShare.upsert({
      where: { id: share.id },
      create: {
        id: share.id,
        boardId: share.boardId,
        email: share.email,
        permissionLevel: share.permissionLevel,
        status: share.status,
        invitedById: share.invitedById,
        inviteToken: share.inviteToken,
        tokenExpiresAt: share.tokenExpiresAt,
        acceptedAt: share.acceptedAt,
        declinedAt: share.declinedAt,
        revokedAt: share.revokedAt,
        publicId: share.publicId,
        updatedAt: new Date(),
      },
      update: {
        permissionLevel: share.permissionLevel,
        status: share.status,
        acceptedAt: share.acceptedAt,
        declinedAt: share.declinedAt,
        revokedAt: share.revokedAt,
        updatedAt: new Date(),
      },
    });
  }

  async deleteShare(id: string): Promise<void> {
    await this.prisma.boardShare.delete({ where: { id } });
  }

  // ── BoardMember ──────────────────────────────────────────────────────────────

  private rawToMember(raw: Prisma.BoardMemberGetPayload<object>): BoardMember {
    const props = {
      boardId: raw.boardId,
      userId: raw.userId,
      role: raw.role as BoardMemberRole,
      publicId: raw.publicId,
    };
    return BoardMember.create(props, raw.id).getValue();
  }

  async findMemberByBoardAndUser(boardId: string, userId: string): Promise<BoardMember | null> {
    const raw = await this.prisma.boardMember.findUnique({
      where: { boardId_userId: { boardId, userId } },
    });
    return raw ? this.rawToMember(raw) : null;
  }

  async findMembersByBoardId(boardId: string): Promise<BoardMember[]> {
    const raws = await this.prisma.boardMember.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
    });
    return raws.map((r) => this.rawToMember(r));
  }

  async findMembersByUserId(userId: string): Promise<BoardMember[]> {
    const raws = await this.prisma.boardMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return raws.map((r) => this.rawToMember(r));
  }

  async saveMember(member: BoardMember): Promise<void> {
    await this.prisma.boardMember.upsert({
      where: { id: member.id },
      create: {
        id: member.id,
        boardId: member.boardId,
        userId: member.userId,
        role: member.role,
        publicId: member.publicId,
        updatedAt: new Date(),
      },
      update: {
        role: member.role,
        updatedAt: new Date(),
      },
    });
  }

  async deleteMember(id: string): Promise<void> {
    await this.prisma.boardMember.delete({ where: { id } });
  }

  async deleteMembersByBoardId(boardId: string): Promise<void> {
    await this.prisma.boardMember.deleteMany({ where: { boardId } });
  }
}
