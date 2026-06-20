import { InternalServerErrorException } from '@nestjs/common';
import {
  Notification as PrismaNotification,
  NotificationType as PrismaNotificationType,
  User as PrismaUser,
} from '@prisma/client';
import {
  Notification,
  NotificationType,
  type NotificationRefType,
  type DueDateMilestone,
} from '../../domain/notification.entity';
import { NotificationResponseDto } from '../../application/dto/notification-response.dto';

type PrismaNotificationWithActor = PrismaNotification & {
  actor?: PrismaUser | null;
};

export class NotificationMapper {
  public static toDomain(raw: PrismaNotificationWithActor): Notification {
    const result = Notification.create(
      {
        recipientId: raw.recipientId,
        actorId: raw.actorId ?? undefined,
        type: raw.type as unknown as NotificationType,
        title: raw.title,
        body: raw.body ?? undefined,
        refType: raw.refType as NotificationRefType,
        refId: raw.refId,
        boardId: raw.boardId ?? undefined,
        milestone: (raw.milestone as DueDateMilestone) ?? undefined,
        readAt: raw.readAt ?? undefined,
        createdAt: raw.createdAt,
        actorName: raw.actor?.name ?? undefined,
      },
      raw.id,
    );

    if (result.isFailure) {
      // A row from the DB should always satisfy the entity's invariants.
      // If it doesn't, that's a data-integrity problem we want to surface as
      // a 500 — not a 400 (the input isn't user-supplied here).
      throw new InternalServerErrorException(
        `Notification mapping error: ${result.error}`,
      );
    }

    return result.getValue();
  }

  public static toPersistence(notification: Notification) {
    return {
      id: notification.id,
      recipientId: notification.recipientId,
      actorId: notification.actorId ?? null,
      type: notification.type as unknown as PrismaNotificationType,
      title: notification.title,
      body: notification.body ?? null,
      refType: notification.refType,
      refId: notification.refId,
      boardId: notification.boardId ?? null,
      milestone: notification.milestone ?? null,
      readAt: notification.readAt ?? null,
    };
  }

  /**
   * Public wire shape (no `props` / `_id` leakage). Single source of truth
   * used by both the controller response and the WebSocket gateway payload.
   */
  public static toWire(notification: Notification): NotificationResponseDto {
    return NotificationResponseDto.fromEntity(notification);
  }
}
