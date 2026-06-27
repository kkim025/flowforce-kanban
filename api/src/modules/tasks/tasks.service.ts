import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Task, Priority, Comment, Activity } from '@prisma/client';
import { MentionParser } from '../notifications/infrastructure/mention.parser';

/**
 * Wire-shape tag payload accepted on create / update. The `id` is optional —
 * if absent (or not matching an existing Tag on the same board), the service
 * creates a new Tag row using `name` + `color`.
 */
export interface TaskTagInput {
  id?: string;
  name: string;
  color?: string;
}

const DEFAULT_TAG_COLOR = '#94a3b8';

/**
 * Projected tag shape returned alongside Task rows so the wire payload stays
 * backwards-compatible-looking ({id, name, color}) without dragging in the
 * full Prisma `Tag` type (which carries createdAt / updatedAt).
 */
type TaskTagWire = { id: string; name: string; color: string };

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async checkColumnOwnership(userId: string, columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column) throw new NotFoundException('Column not found');
    if (column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');
    return column;
  }

  private async getBoardIdForColumn(columnId: string): Promise<string> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      select: { boardId: true },
    });
    if (!column) throw new NotFoundException('Column not found');
    return column.boardId;
  }

  /**
   * Reconcile a task's tag join rows. For every requested tag:
   *   1. If `id` is provided AND a Tag with that id exists on the board → reuse it.
   *   2. Otherwise look up an existing Tag by `(boardId, name)`.
   *   3. If neither, create a new Tag on the board with the requested color
   *      (or default `#94a3b8`).
   * Then deletes all existing TaskTag rows for this task and inserts the
   * resolved set. Returns the resolved tags as the wire shape.
   */
  private async reconcileTaskTags(
    tx:
      | PrismaService
      | Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    boardId: string,
    taskId: string,
    inputs: TaskTagInput[],
  ): Promise<TaskTagWire[]> {
    const normalized = inputs
      .map((t) => ({
        id: t.id,
        name: (t.name || '').trim().toLowerCase(),
        color: t.color || DEFAULT_TAG_COLOR,
      }))
      .filter((t) => t.name.length > 0);

    // De-dup by name (case-insensitive) so attaching the same library tag twice
    // yields one join row.
    const byName = new Map<
      string,
      { id?: string; name: string; color: string }
    >();
    for (const t of normalized) {
      if (!byName.has(t.name)) byName.set(t.name, t);
    }

    const resolved: TaskTagWire[] = [];

    for (const t of byName.values()) {
      let tagId: string | undefined = t.id;

      if (tagId) {
        const existing = await tx.tag.findUnique({ where: { id: tagId } });
        if (!existing || existing.boardId !== boardId) {
          // Provided id does not belong to this board — fall through to lookup/create.
          tagId = undefined;
        }
      }

      if (!tagId) {
        const byNameRow = await tx.tag.findUnique({
          where: { boardId_name: { boardId, name: t.name } },
        });
        if (byNameRow) {
          tagId = byNameRow.id;
        }
      }

      if (!tagId) {
        const created = await tx.tag.create({
          data: {
            boardId,
            name: t.name,
            color: t.color,
          },
        });
        tagId = created.id;
      }

      resolved.push({ id: tagId, name: t.name, color: t.color });
    }

    // Replace joins. Cascade on Tag.delete already removed existing rows
    // for tags that no longer exist; here we wipe the task's existing joins
    // and re-insert the resolved set.
    await tx.taskTag.deleteMany({ where: { taskId } });
    if (resolved.length > 0) {
      await tx.taskTag.createMany({
        data: resolved.map((t) => ({ taskId, tagId: t.id })),
        skipDuplicates: true,
      });
    }

    return resolved;
  }

  async create(
    userId: string,
    data: {
      id?: string;
      content: string;
      columnId: string;
      order: number;
      priority?: Priority;
      description?: string;
      tags?: TaskTagInput[];
      sprintId?: string;
      dueDate?: string;
    },
  ): Promise<Task & { tags: TaskTagWire[] }> {
    await this.checkColumnOwnership(userId, data.columnId);

    const boardId = await this.getBoardIdForColumn(data.columnId);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          id: data.id, // Optional ID from frontend
          content: data.content,
          columnId: data.columnId,
          order: data.order,
          priority: data.priority,
          description: data.description,
          sprintId: data.sprintId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
      });

      const resolvedTags = await this.reconcileTaskTags(
        tx,
        boardId,
        created.id,
        data.tags || [],
      );

      return { ...created, tags: resolvedTags };
    });

    // Log activity
    await this.logActivity(userId, task.id, 'task_created');

    return task as Task & { tags: TaskTagWire[] };
  }

  async findAll(
    userId: string,
    columnId: string,
  ): Promise<(Task & { tags: TaskTagWire[] })[]> {
    await this.checkColumnOwnership(userId, columnId);
    const rawTasks = await this.prisma.task.findMany({
      where: {
        columnId,
        archived: false,
      },
      orderBy: { order: 'asc' },
      include: {
        subtasks: true,
        comments: true,
        activities: true,
        taskTags: {
          include: { tag: true },
        },
      },
    });
    return rawTasks.map((t) => ({
      ...t,
      tags: t.taskTags.map((tt) => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color,
      })),
    })) as (Task & { tags: TaskTagWire[] })[];
  }

  async update(
    userId: string,
    id: string,
    data: {
      content?: string;
      columnId?: string;
      order?: number;
      priority?: Priority;
      description?: string;
      archived?: boolean;
      assigneeId?: string;
      tags?: TaskTagInput[];
      sprintId?: string;
      dueDate?: string;
      estimatedMinutes?: number;
    },
  ): Promise<Task & { tags: TaskTagWire[] }> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    // If moving to another column, check ownership of new column
    if (data.columnId && data.columnId !== task.columnId) {
      await this.checkColumnOwnership(userId, data.columnId);
    }

    const targetBoardId =
      data.columnId && data.columnId !== task.columnId
        ? await this.getBoardIdForColumn(data.columnId)
        : task.column.boardId;

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedTask = await tx.task.update({
        where: { id },
        data: {
          content: data.content,
          columnId: data.columnId,
          order: data.order,
          priority: data.priority,
          description: data.description,
          archived: data.archived,
          assigneeId: data.assigneeId,
          sprintId: data.sprintId,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          estimatedMinutes: data.estimatedMinutes,
        },
      });

      let resolvedTags: TaskTagWire[];
      if (data.tags !== undefined) {
        resolvedTags = await this.reconcileTaskTags(
          tx,
          targetBoardId,
          id,
          data.tags,
        );
      } else {
        // Carry through existing tags without touching the join table.
        const existing = await tx.taskTag.findMany({
          where: { taskId: id },
          include: { tag: true },
        });
        resolvedTags = existing.map((tt) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color,
        }));
      }

      return { ...updatedTask, tags: resolvedTags };
    });

    // Log changes
    if (data.priority && data.priority !== task.priority) {
      await this.logActivity(userId, id, 'priority_change', {
        from: task.priority,
        to: data.priority,
      });
    }
    if (data.assigneeId !== undefined && data.assigneeId !== task.assigneeId) {
      await this.logActivity(userId, id, 'assignee_change', {
        from: task.assigneeId,
        to: data.assigneeId,
      });
    }

    // Append-only: emit a domain event when the task is actually reassigned to
    // a new user. Self-reassignment and unassignment (null) are skipped by
    // the listener.
    if (
      data.assigneeId !== undefined &&
      data.assigneeId !== null &&
      data.assigneeId !== task.assigneeId
    ) {
      this.eventEmitter.emit('task.assigned', {
        taskId: id,
        prevAssigneeId: task.assigneeId,
        newAssigneeId: data.assigneeId,
        actorId: userId,
        boardId: task.column.boardId,
        taskContent: task.content,
      });
    }

    return result as Task & { tags: TaskTagWire[] };
  }

  async remove(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.task.delete({
      where: { id },
    });
  }

  async addComment(
    userId: string,
    taskId: string,
    content: string,
  ): Promise<Comment> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    // Resolve @mentions to user ids before writing the comment row.
    // Pre-fetch only users whose names match the @-tokens in the content —
    // avoids loading the entire user table on every comment.
    const mentionTokens = MentionParser.extractTokens(content);
    const users =
      mentionTokens.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: {
              name: { in: mentionTokens, mode: 'insensitive' },
            },
            select: { id: true, name: true },
          });
    const mentionedUserIds = MentionParser.parse(content, users);

    const comment = await this.prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
        mentionedUserIds,
      },
    });

    await this.logActivity(userId, taskId, 'comment', { text: content });

    // Append-only: emit a domain event for the notifications listener.
    this.eventEmitter.emit('comment.created', {
      commentId: comment.id,
      taskId,
      actorId: userId,
      mentionedUserIds,
      boardId: task.column.boardId,
      taskContent: task.content,
    });

    return comment;
  }

  async assignSprint(
    userId: string,
    taskId: string,
    sprintId: string | null,
  ): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    // If sprintId is provided, verify it belongs to the same board
    if (sprintId) {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id: sprintId },
      });
      if (!sprint) throw new NotFoundException('Sprint not found');
      if (sprint.boardId !== task.column.boardId)
        throw new ForbiddenException('Sprint does not belong to this board');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: { sprintId },
    });
  }

  async logActivity(
    userId: string,
    taskId: string,
    type: string,
    details?: any,
  ): Promise<Activity> {
    return this.prisma.activity.create({
      data: {
        type,
        details,
        taskId,
        userId,
      },
    });
  }
}
