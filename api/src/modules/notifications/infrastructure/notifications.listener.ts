import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CreateNotificationUseCase } from '../application/use-cases/create-notification.use-case';
import { Notification } from '../domain/notification.entity';
import { NotificationType } from '../domain/notification-type.value-object';
import type { INotificationsEmitter } from './notifications.emitter';
import { NOTIFICATIONS_EMITTER } from './notifications.emitter';

export interface TaskAssignedEvent {
  taskId: string;
  prevAssigneeId: string | null;
  newAssigneeId: string | null;
  actorId: string;
  boardId: string;
  taskContent: string;
}

export interface CommentCreatedEvent {
  commentId: string;
  taskId: string;
  actorId: string;
  mentionedUserIds: string[];
  boardId: string;
  taskContent: string;
}

export interface SprintStatusChangedEvent {
  sprintId: string;
  sprintName: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  boardId: string;
  recipientId: string;
}

/**
 * Translates domain events into Notification rows + socket pushes.
 * Always swallows errors — a misbehaving listener never breaks the originating use case.
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(
    private readonly createUseCase: CreateNotificationUseCase,
    @Inject(NOTIFICATIONS_EMITTER)
    private readonly emitter: INotificationsEmitter,
  ) {}

  @OnEvent('task.assigned')
  public async handleTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    try {
      if (event.newAssigneeId === null || event.newAssigneeId === undefined) {
        return;
      }
      if (event.newAssigneeId === event.actorId) {
        return;
      }
      const result = Notification.create({
        recipientId: event.newAssigneeId,
        actorId: event.actorId,
        type: NotificationType.ASSIGNMENT,
        title: `You were assigned "${event.taskContent}"`,
        refType: 'task',
        refId: event.taskId,
        boardId: event.boardId,
      });
      if (result.isFailure) {
        this.logger.warn(
          `Invalid assignment notification: ${result.errorValue()}`,
        );
        return;
      }
      await this.dispatch(result.getValue());
    } catch (err) {
      this.logger.error(
        `task.assigned handler failed: ${(err as Error).message}`,
      );
    }
  }

  @OnEvent('comment.created')
  public async handleCommentCreated(event: CommentCreatedEvent): Promise<void> {
    // Filter once, then fan out concurrently. Each dispatch is two awaits
    // (persist + emit), so a comment with 20 mentions used to take 40
    // sequential round-trips; now it's bounded by the slowest.
    const recipients = event.mentionedUserIds.filter(
      (id) => id !== event.actorId,
    );
    if (recipients.length === 0) return;

    const candidates: Notification[] = [];
    for (const recipientId of recipients) {
      const result = Notification.create({
        recipientId,
        actorId: event.actorId,
        type: NotificationType.MENTION,
        title: `You were mentioned in "${event.taskContent}"`,
        refType: 'task',
        refId: event.taskId,
        boardId: event.boardId,
      });
      if (result.isFailure) {
        this.logger.warn(
          `Invalid mention notification: ${result.errorValue()}`,
        );
        continue;
      }
      candidates.push(result.getValue());
    }

    const outcomes = await Promise.allSettled(
      candidates.map((n) => this.dispatch(n)),
    );
    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'rejected') {
        this.logger.error(
          `comment.created handler failed for ${candidates[i].recipientId}: ${(outcome.reason as Error).message}`,
        );
      }
    });
  }

  @OnEvent('sprint.status_changed')
  public async handleSprintStatusChanged(
    event: SprintStatusChangedEvent,
  ): Promise<void> {
    try {
      if (event.recipientId === event.actorId) {
        return;
      }
      const result = Notification.create({
        recipientId: event.recipientId,
        actorId: event.actorId,
        type: NotificationType.SPRINT_STATUS,
        title: `Sprint "${event.sprintName}" is now ${event.toStatus}`,
        refType: 'sprint',
        refId: event.sprintId,
        boardId: event.boardId,
      });
      if (result.isFailure) {
        this.logger.warn(`Invalid sprint notification: ${result.errorValue()}`);
        return;
      }
      await this.dispatch(result.getValue());
    } catch (err) {
      this.logger.error(
        `sprint.status_changed handler failed: ${(err as Error).message}`,
      );
    }
  }

  private async dispatch(notification: Notification): Promise<void> {
    const persisted = await this.createUseCase.execute(notification);
    if (persisted === null) {
      // Recipient has the type muted; the use case returned null. Do not push.
      return;
    }
    this.emitter.emitTo(persisted.recipientId, persisted);
  }
}
