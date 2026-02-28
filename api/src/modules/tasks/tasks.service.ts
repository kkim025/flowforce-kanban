import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Task, Priority } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async checkColumnOwnership(userId: string, columnId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });
    if (!column) throw new NotFoundException('Column not found');
    if (column.board.ownerId !== userId) throw new ForbiddenException('Access denied');
    return column;
  }

  async create(userId: string, data: { content: string; columnId: string; order: number; priority?: Priority; description?: string }): Promise<Task> {
    await this.checkColumnOwnership(userId, data.columnId);

    return this.prisma.task.create({
      data: {
        content: data.content,
        columnId: data.columnId,
        order: data.order,
        priority: data.priority,
        description: data.description,
      },
    });
  }

  async findAll(userId: string, columnId: string): Promise<Task[]> {
    await this.checkColumnOwnership(userId, columnId);
    return this.prisma.task.findMany({
      where: { columnId },
      orderBy: { order: 'asc' },
      include: { subtasks: true },
    });
  }

  async update(userId: string, id: string, data: { content?: string; columnId?: string; order?: number; priority?: Priority; description?: string }): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    // If moving to another column, check ownership of new column
    if (data.columnId && data.columnId !== task.columnId) {
      await this.checkColumnOwnership(userId, data.columnId);
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        content: data.content,
        columnId: data.columnId,
        order: data.order,
        priority: data.priority,
        description: data.description,
      },
    });
  }

  async remove(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { column: { include: { board: true } } },
    });

    if (!task) throw new NotFoundException('Task not found');
    if (task.column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.task.delete({
      where: { id },
    });
  }
}
