import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
    if (task.column.board.ownerId !== userId)
      throw new ForbiddenException('Access denied');
    return task;
  }

  async checkChecklistOwnership(userId: string, checklistId: string) {
    const checklist = await this.prisma.checklist.findUnique({
      where: { id: checklistId },
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
    return checklist;
  }

  async create(
    userId: string,
    data: { content: string; taskId?: string; checklistId?: string },
  ): Promise<Subtask> {
    if (data.checklistId) {
      await this.checkChecklistOwnership(userId, data.checklistId);
    } else if (data.taskId) {
      await this.checkTaskOwnership(userId, data.taskId);
    } else {
      throw new Error('Either taskId or checklistId must be provided');
    }

    return this.prisma.subtask.create({
      data: {
        content: data.content,
        taskId: data.taskId,
        checklistId: data.checklistId,
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: { content?: string; completed?: boolean },
  ): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({
      where: { id },
      include: {
        task: { include: { column: { include: { board: true } } } },
        checklist: {
          include: {
            task: { include: { column: { include: { board: true } } } },
          },
        },
      },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');

    const ownerId =
      subtask.task?.column.board.ownerId ||
      subtask.checklist?.task.column.board.ownerId;
    if (ownerId !== userId) throw new ForbiddenException('Access denied');

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
        task: { include: { column: { include: { board: true } } } },
        checklist: {
          include: {
            task: { include: { column: { include: { board: true } } } },
          },
        },
      },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');

    const ownerId =
      subtask.task?.column.board.ownerId ||
      subtask.checklist?.task.column.board.ownerId;
    if (ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.subtask.delete({
      where: { id },
    });
  }

  async toggle(userId: string, id: string): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({
      where: { id },
      include: {
        task: { include: { column: { include: { board: true } } } },
        checklist: {
          include: {
            task: { include: { column: { include: { board: true } } } },
          },
        },
      },
    });

    if (!subtask) throw new NotFoundException('Subtask not found');

    const ownerId =
      subtask.task?.column.board.ownerId ||
      subtask.checklist?.task.column.board.ownerId;
    if (ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.subtask.update({
      where: { id },
      data: { completed: !subtask.completed },
    });
  }

  async reorder(
    userId: string,
    checklistId: string,
    orderedIds: string[],
  ): Promise<void> {
    // Verify ownership via checklist chain
    await this.checkChecklistOwnership(userId, checklistId);

    // Update order for each subtask in the ordered list
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.subtask.update({
          where: { id },
          data: { order: index },
        }),
      ),
    );
  }

  async findAllByChecklist(checklistId: string): Promise<Subtask[]> {
    return this.prisma.subtask.findMany({
      where: { checklistId },
      orderBy: { order: 'asc' },
    });
  }
}
