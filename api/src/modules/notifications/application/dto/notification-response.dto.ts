import { Notification } from '../../domain/notification.entity';
import {
  type NotificationRefType,
  type NotificationType,
  type DueDateMilestone,
} from '../../domain/notification-type.value-object';

/**
 * Public wire shape for a notification. Strips the domain entity's `props`
 * and `_id` private fields and freezes a stable contract for clients.
 */
export class NotificationResponseDto {
  public id!: string;
  public type!: NotificationType;
  public title!: string;
  public body!: string | null;
  public refType!: NotificationRefType;
  public refId!: string;
  public boardId!: string | null;
  public actorId!: string | null;
  public actorName!: string | null;
  public milestone!: DueDateMilestone | null;
  public readAt!: Date | null;
  public createdAt!: Date;

  public static fromEntity(n: Notification): NotificationResponseDto {
    const dto = new NotificationResponseDto();
    dto.id = n.id;
    dto.type = n.type;
    dto.title = n.title;
    dto.body = n.body ?? null;
    dto.refType = n.refType;
    dto.refId = n.refId;
    dto.boardId = n.boardId ?? null;
    dto.actorId = n.actorId ?? null;
    dto.actorName = n.actorName ?? null;
    dto.milestone = (n.milestone as DueDateMilestone) ?? null;
    dto.readAt = n.readAt ?? null;
    dto.createdAt = n.createdAt ?? new Date();
    return dto;
  }
}
