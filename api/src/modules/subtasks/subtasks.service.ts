import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Subtask } from '@prisma/client';

@Injectable()
export class SubtasksService {
  constructor(private prisma: PrismaService) {}

  private async checkTaskOwnership(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: { board: true },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId) throw new ForbiddenException('Access denied');
    return task;
  }

  async create(userId: string, data: { content: string; taskId: string }): Promise<Subtask> {
    await this.checkTaskOwnership(userId, data.taskId);

    return this.prisma.subtask.create({
      data: {
        content: data.content,
        taskId: data.taskId,
      },
    });
  }

  async update(userId: string, id: string, data: { content?: string; completed?: boolean }): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            column: {
              include: { board: true },
            },
          },
        },
      },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');
    if (subtask.task.column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.subtask.update({
      where: { id },
      data: {
        content: data.content,
        completed: data.completed,
      },
    });
  }

  async remove(userId: string, id: string): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            column: {
              include: { board: true },
            },
          },
        },
      },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');
    if (subtask.task.column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.subtask.delete({
      where: { id },
    });
  }
}
