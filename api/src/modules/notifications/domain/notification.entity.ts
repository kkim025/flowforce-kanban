import { AggregateRoot } from '../../../common/domain/aggregate-root';
import { Result } from '../../../common/domain/result';
import {
  DueDateMilestone,
  NotificationRefType,
  NotificationType,
} from './notification-type.value-object';

export {
  NotificationType,
  type NotificationRefType,
  type DueDateMilestone,
} from './notification-type.value-object';

export interface NotificationProps {
  recipientId: string;
  actorId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  refType: NotificationRefType;
  refId: string;
  boardId?: string;
  milestone?: DueDateMilestone;
  readAt?: Date;
  createdAt?: Date;
  actorName?: string;
}

export class Notification extends AggregateRoot<NotificationProps> {
  private constructor(props: NotificationProps, id?: string) {
    super(props, id);
  }

  get recipientId(): string {
    return this.props.recipientId;
  }

  get actorId(): string | undefined {
    return this.props.actorId;
  }

  get type(): NotificationType {
    return this.props.type;
  }

  get title(): string {
    return this.props.title;
  }

  get body(): string | undefined {
    return this.props.body;
  }

  get refType(): NotificationRefType {
    return this.props.refType;
  }

  get refId(): string {
    return this.props.refId;
  }

  get boardId(): string | undefined {
    return this.props.boardId;
  }

  get milestone(): DueDateMilestone | undefined {
    return this.props.milestone;
  }

  get readAt(): Date | undefined {
    return this.props.readAt;
  }

  get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  get actorName(): string | undefined {
    return this.props.actorName;
  }

  public static create(
    props: NotificationProps,
    id?: string,
  ): Result<Notification> {
    if (!props.recipientId) {
      return Result.fail<Notification>('Notification recipientId is required');
    }
    if (!props.title) {
      return Result.fail<Notification>('Notification title is required');
    }
    if (!props.type) {
      return Result.fail<Notification>('Notification type is required');
    }
    if (!props.refType) {
      return Result.fail<Notification>('Notification refType is required');
    }
    if (!props.refId) {
      return Result.fail<Notification>('Notification refId is required');
    }

    return Result.ok<Notification>(new Notification({ ...props }, id));
  }

  /**
   * Marks the notification as read at the given time (defaults to now).
   * Idempotent — calling twice is safe.
   */
  public markAsRead(at: Date = new Date()): void {
    this.props.readAt = at;
  }

  public isUnread(): boolean {
    return this.props.readAt === undefined;
  }
}
