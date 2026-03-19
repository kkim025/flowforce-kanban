import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Checklist } from '@prisma/client';

@Injectable()
export class ChecklistsService {
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
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');
    return task;
  }

  async create(
    userId: string,
    data: { title: string; taskId: string },
  ): Promise<Checklist> {
    await this.checkTaskOwnership(userId, data.taskId);

    return this.prisma.checklist.create({
      data: {
        title: data.title,
        taskId: data.taskId,
      },
      include: {
        items: true,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: { title?: string },
  ): Promise<Checklist> {
    const checklist = await this.prisma.checklist.findUnique({
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

    if (!checklist) throw new NotFoundException('Checklist not found');
    if (checklist.task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.checklist.update({
      where: { id },
      data: {
        title: data.title,
      },
      include: {
        items: true,
      },
    });
  }

  async remove(userId: string, id: string): Promise<Checklist> {
    const checklist = await this.prisma.checklist.findUnique({
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

    if (!checklist) throw new NotFoundException('Checklist not found');
    if (checklist.task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.checklist.delete({
      where: { id },
    });
  }
}
