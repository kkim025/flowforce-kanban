import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Notification } from '../../domain/notification.entity';
import {
  INotificationRepository,
  ListNotificationsQuery,
  NotificationListResult,
  NOTIFICATION_REPOSITORY,
} from '../../domain/notifications.repository.interface';
import { NotificationMapper } from './notification.mapper';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class PrismaNotificationRepository implements INotificationRepository {
  constructor(private prisma: PrismaService) {}

  async create(notification: Notification): Promise<Notification> {
    const data = NotificationMapper.toPersistence(notification);
    const created = await this.prisma.notification.create({
      data: data as Prisma.NotificationUncheckedCreateInput,
    });
    return NotificationMapper.toDomain(created);
  }

  async findByIdForRecipient(
    id: string,
    recipientId: string,
  ): Promise<Notification | null> {
    const raw = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });
    if (!raw) return null;
    return NotificationMapper.toDomain(raw);
  }

  async listForRecipient(
    recipientId: string,
    query?: ListNotificationsQuery,
  ): Promise<NotificationListResult> {
    const limit = Math.min(query?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    // Fetch one extra to know if there's a next page.
    const findArgs: Prisma.NotificationFindManyArgs = {
      where: {
        recipientId,
        ...(query?.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    };
    if (query?.cursor) {
      findArgs.skip = 1;
      findArgs.cursor = { id: query.cursor };
    }

    const rows = await this.prisma.notification.findMany(findArgs);
    const hasMore = rows.length > limit;
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r) =>
      NotificationMapper.toDomain(r),
    );
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async countUnreadForRecipient(recipientId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId, readAt: null },
    });
  }

  async markRead(id: string, recipientId: string): Promise<Notification> {
    // Only update if the notification is unread AND owned by the recipient.
    const { count } = await this.prisma.notification.updateMany({
      where: { id, recipientId, readAt: null },
      data: { readAt: new Date() },
    });

    if (count > 0) {
      // The notification just transitioned to read. Re-read it to return the
      // current state (we need the row, not just the count).
      const updated = await this.prisma.notification.findUnique({
        where: { id },
      });
      if (!updated) {
        // Race: row deleted between updateMany and findUnique. Surface as 404.
        throw new NotFoundException('Notification not found');
      }
      return NotificationMapper.toDomain(updated);
    }

    // count === 0 — either the row doesn't exist for this recipient, or it
    // was already read. Distinguish the two with a single follow-up read.
    const found = await this.prisma.notification.findFirst({
      where: { id, recipientId },
    });
    if (!found) {
      throw new NotFoundException('Notification not found');
    }
    // Already-read is a valid idempotent outcome — return the current state.
    return NotificationMapper.toDomain(found);
  }

  async markAllReadForRecipient(recipientId: string): Promise<number> {
    const { count } = await this.prisma.notification.updateMany({
      where: { recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return count;
  }
}

export { NOTIFICATION_REPOSITORY };
