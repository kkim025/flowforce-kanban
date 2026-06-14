import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { NotificationType as PrismaNotificationType } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { NotificationType } from '../../../notifications/domain/notification-type.value-object';
import { UserNotificationPref } from '../../domain/user-notification-pref.entity';
import {
  IUserNotificationPrefRepository,
  USER_NOTIFICATION_PREF_REPOSITORY,
} from '../../domain/user-notification-prefs.repository.interface';

@Injectable()
export class PrismaUserNotificationPrefRepository implements IUserNotificationPrefRepository {
  constructor(private prisma: PrismaService) {}

  async listForUser(userId: string): Promise<UserNotificationPref[]> {
    const rows = await this.prisma.userNotificationPref.findMany({
      where: { userId },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findOne(
    userId: string,
    type: NotificationType,
  ): Promise<UserNotificationPref | null> {
    const row = await this.prisma.userNotificationPref.findUnique({
      where: {
        userId_type: {
          userId,
          type: type as unknown as PrismaNotificationType,
        },
      },
    });
    if (!row) return null;
    return this.toDomain(row);
  }

  async isEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await this.findOne(userId, type);
    // No row = allowed (most-permissive default).
    return pref ? pref.inAppEnabled : true;
  }

  /**
   * Returns the subset of `recipientIds` whose prefs allow the given type.
   * Recipients with no row are treated as enabled (most-permissive default),
   * so they are always included.
   */
  async filterEnabled(
    recipientIds: string[],
    type: NotificationType,
  ): Promise<string[]> {
    if (recipientIds.length === 0) return [];
    const rows = await this.prisma.userNotificationPref.findMany({
      where: {
        userId: { in: recipientIds },
        type: type as unknown as PrismaNotificationType,
      },
      select: { userId: true, inAppEnabled: true },
    });
    const disabled = new Set(
      rows.filter((r) => !r.inAppEnabled).map((r) => r.userId),
    );
    return recipientIds.filter((id) => !disabled.has(id));
  }

  async upsert(
    userId: string,
    type: NotificationType,
    inAppEnabled: boolean,
  ): Promise<UserNotificationPref> {
    const row = await this.prisma.userNotificationPref.upsert({
      where: {
        userId_type: {
          userId,
          type: type as unknown as PrismaNotificationType,
        },
      },
      update: { inAppEnabled },
      create: {
        userId,
        type: type as unknown as PrismaNotificationType,
        inAppEnabled,
      },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    id: string;
    userId: string;
    type: string;
    inAppEnabled: boolean;
  }): UserNotificationPref {
    const result = UserNotificationPref.create(
      {
        userId: row.userId,
        type: row.type as unknown as NotificationType,
        inAppEnabled: row.inAppEnabled,
      },
      row.id,
    );
    if (result.isFailure) {
      // A row that came back from Prisma should always satisfy the entity's
      // invariants. If it doesn't, that's a data-integrity problem we want to
      // surface as a 500 — not a 400 (the input isn't user-supplied here).
      throw new InternalServerErrorException(
        `UserNotificationPref mapping error: ${result.error}`,
      );
    }
    return result.getValue();
  }
}

export { USER_NOTIFICATION_PREF_REPOSITORY };
