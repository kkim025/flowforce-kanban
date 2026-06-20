import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { IBoardSharingRepository } from './domain/board-sharing.repository.interface';
import { BoardShare } from './domain/board-share.entity';
import { BoardMember } from './domain/board-member.entity';
import { InviteEmailBuilder } from '../../mail/templates/invite-email.builder';
import { MailService } from '../../mail/mail.service';

const TOKEN_EXPIRY_HOURS = 7 * 24; // 7 days

@Injectable()
export class BoardSharingService {
  constructor(
    private readonly repo: IBoardSharingRepository,
    private readonly emailBuilder: InviteEmailBuilder,
    private readonly mailService: MailService,
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
    const existing = await this.repo.findPendingShare(boardId, email);
    if (existing) {
      throw new BadRequestException('A pending invite already exists for this email on this board');
    }

    const inviteToken = uuidv4();
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

    const shareResult = BoardShare.create({
      boardId,
      email,
      permissionLevel,
      status: 'PENDING',
      invitedById,
      inviteToken,
      tokenExpiresAt,
      publicId: uuidv4(),
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
    if (!share.isPending()) throw new BadRequestException(`Invite is no longer pending (status: ${share.status})`);
    if (share.isExpired()) throw new BadRequestException('Invite has expired');

    const memberRole: 'VIEWER' | 'EDITOR' = share.permissionLevel === 'EDIT' ? 'EDITOR' : 'VIEWER';

    const memberResult = BoardMember.create({
      boardId: share.boardId,
      userId,
      role: memberRole,
      publicId: uuidv4(),
    });

    if (memberResult.isFailure) {
      throw new BadRequestException(String(memberResult.error));
    }

    const member = memberResult.getValue();
    share.accept();
    await this.repo.saveShare(share);
    await this.repo.saveMember(member);

    return member;
  }

  async declineShare(token: string): Promise<void> {
    const share = await this.repo.findShareByToken(token);
    if (!share) throw new NotFoundException('Invite not found');
    if (!share.isPending()) throw new BadRequestException(`Invite is no longer pending (status: ${share.status})`);
    share.decline();
    await this.repo.saveShare(share);
  }

  async revokeShare(shareId: string, _requestingUserId: string): Promise<void> {
    const share = await this.repo.findShareById(shareId);
    if (!share) throw new NotFoundException('Invite not found');
    if (share.invitedById !== _requestingUserId) {
      throw new BadRequestException('Only the inviter can revoke this invite');
    }
    share.revoke();
    await this.repo.saveShare(share);
  }

  async listSharesForBoard(boardId: string): Promise<BoardShare[]> {
    return this.repo.findSharesByBoardId(boardId);
  }

  async listPendingSharesForEmail(email: string): Promise<BoardShare[]> {
    return this.repo.findSharesByEmail(email, 'PENDING');
  }

  async listMembersForBoard(boardId: string): Promise<BoardMember[]> {
    return this.repo.findMembersByBoardId(boardId);
  }

  async listMembershipsForUser(userId: string): Promise<BoardMember[]> {
    return this.repo.findMembersByUserId(userId);
  }

  async removeMember(boardId: string, memberId: string, requestingUserId: string): Promise<void> {
    const member = await this.repo.findMemberByBoardAndUser(boardId, memberId);
    if (!member) throw new NotFoundException('Member not found');
    await this.repo.deleteMember(member.id);
  }
}
