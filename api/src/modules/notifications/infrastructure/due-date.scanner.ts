import { Injectable, Logger } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateNotificationUseCase } from '../application/use-cases/create-notification.use-case';
import { Notification } from '../domain/notification.entity';
import {
  NotificationType,
  type DueDateMilestone,
} from '../domain/notification-type.value-object';

interface MilestoneWindow {
  milestone: DueDateMilestone;
  /** Returns the upper bound for `dueDate` (inclusive). Lower bound is `now`. */
  upperBound: (now: Date) => Date;
  /** If true, this is a "due now" window — `dueDate <= now` rather than `now <= dueDate <= ...`. */
  isPast: boolean;
}

const WINDOWS: MilestoneWindow[] = [
  {
    milestone: '24h',
    upperBound: (now) => new Date(now.getTime() + 24 * 60 * 60 * 1000),
    isPast: false,
  },
  {
    milestone: '1h',
    upperBound: (now) => new Date(now.getTime() + 60 * 60 * 1000),
    isPast: false,
  },
  { milestone: 'due', upperBound: (now) => now, isPast: true },
];

// Widest upper bound across the configured windows. Used by the cheap
// pre-check that lets us skip the whole tick when nothing is due soon.
const FARTHEST_HORIZON_MS = 24 * 60 * 60 * 1000;

/**
 * Cron-driven scanner that creates DUE_DATE notifications for tasks whose
 * dueDate falls in any of the configured reminder windows.
 *
 * The unique constraint on (recipientId, type=DUE_DATE, refId, milestone) is
 * the source of truth for de-dup — a second scan within the same milestone
 * will hit P2002 and be swallowed.
 *
 * The scanner is also registered in `SchedulerRegistry` under a stable name
 * so tests can stop/start it deterministically (the bare `@Cron` decorator
 * has no inspectable handle).
 */
@Injectable()
export class DueDateScanner {
  private readonly logger = new Logger(DueDateScanner.name);
  public static readonly CRON_NAME = 'due-date-scanner';

  constructor(
    private readonly prisma: PrismaService,
    private readonly createUseCase: CreateNotificationUseCase,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  @Cron('*/5 * * * *', { name: DueDateScanner.CRON_NAME })
  public async tick(): Promise<void> {
    try {
      await this.scan();
    } catch (err) {
      this.logger.error(`due-date scan failed: ${(err as Error).message}`);
    }
  }

  /**
   * Scans all milestones and emits notifications. Exposed for tests.
   */
  public async scan(): Promise<void> {
    const now = new Date();

    // Cheap pre-check: if there are no tasks due in the next 24h (the widest
    // window), every per-window scan is wasted work. This keeps idle systems
    // at one COUNT per tick instead of three full scans.
    const upcomingCount = await this.prisma.task.count({
      where: {
        dueDate: {
          lte: new Date(now.getTime() + FARTHEST_HORIZON_MS),
        },
        assigneeId: { not: null },
        archived: false,
      },
    });
    if (upcomingCount === 0) return;

    // All three windows are independent — run them concurrently.
    await Promise.all(
      WINDOWS.map((window) =>
        this.scanWindow(window, now).catch((err) => {
          // Per-window isolation: a failure in one window must not block
          // the other two. The full-tick try/catch above still catches
          // anything that escapes here (e.g. during Promise.all init).
          this.logger.error(
            `due-date scan failed for milestone ${window.milestone}: ${(err as Error).message}`,
          );
        }),
      ),
    );
  }

  private async scanWindow(window: MilestoneWindow, now: Date): Promise<void> {
    const upper = window.upperBound(now);
    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate: window.isPast ? { lte: upper } : { gte: now, lte: upper },
        assigneeId: { not: null },
        archived: false,
      },
      select: { id: true, assigneeId: true, content: true },
    });

    if (tasks.length === 0) return;

    // Build all notification candidates up front, then fan out the writes
    // concurrently. Each createUseCase.execute is two DB round-trips
    // (pref check + insert); doing them sequentially is O(n) wall-clock.
    const candidates: Notification[] = [];
    for (const task of tasks) {
      if (!task.assigneeId) continue;
      const result = Notification.create({
        recipientId: task.assigneeId,
        type: NotificationType.DUE_DATE,
        milestone: window.milestone,
        title: this.titleFor(window.milestone, task.content),
        refType: 'task',
        refId: task.id,
      });
      if (result.isFailure) {
        this.logger.warn(
          `Invalid due-date notification: ${result.errorValue()}`,
        );
        continue;
      }
      candidates.push(result.getValue());
    }

    const outcomes = await Promise.allSettled(
      candidates.map((c) => this.createUseCase.execute(c)),
    );

    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'rejected') {
        const code = (outcome.reason as { code?: string }).code;
        // P2002 (unique constraint) is expected on re-scans; log and continue.
        if (code === 'P2002') return;
        this.logger.error(
          `due-date scan failed for task ${candidates[i].refId}: ${(outcome.reason as Error).message}`,
        );
      }
    });
  }

  private titleFor(milestone: DueDateMilestone, content: string): string {
    switch (milestone) {
      case '24h':
        return `"${content}" is due tomorrow`;
      case '1h':
        return `"${content}" is due in 1 hour`;
      case 'due':
        return `"${content}" is overdue`;
    }
  }
}
