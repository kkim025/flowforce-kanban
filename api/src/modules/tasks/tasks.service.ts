import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Task, Priority, Comment, Activity } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

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

  async create(
    userId: string,
    data: {
      id?: string;
      content: string;
      columnId: string;
      order: number;
      priority?: Priority;
      description?: string;
      tags?: string[];
    },
  ): Promise<Task> {
    await this.checkColumnOwnership(userId, data.columnId);

    const task = await this.prisma.task.create({
      data: {
        id: data.id, // Optional ID from frontend
        content: data.content,
        columnId: data.columnId,
        order: data.order,
        priority: data.priority,
        description: data.description,
        tags: data.tags || [],
      },
    });

    // Log activity
    await this.logActivity(userId, task.id, 'task_created');

    return task;
  }

  async findAll(userId: string, columnId: string): Promise<Task[]> {
    await this.checkColumnOwnership(userId, columnId);
    return this.prisma.task.findMany({
      where: {
        columnId,
        archived: false,
      },
      orderBy: { order: 'asc' },
      include: {
        subtasks: true,
        comments: true,
        activities: true,
      },
    });
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
      tags?: string[];
    },
  ): Promise<Task> {
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

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        content: data.content,
        columnId: data.columnId,
        order: data.order,
        priority: data.priority,
        description: data.description,
        archived: data.archived,
        assigneeId: data.assigneeId,
        tags: data.tags,
      },
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

    return updatedTask;
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

    const comment = await this.prisma.comment.create({
      data: {
        content,
        taskId,
        userId,
      },
    });

    await this.logActivity(userId, taskId, 'comment', { text: content });

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
