import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';

@Injectable()
export class AssignTaskToSprintUseCase {
  constructor(
    private prisma: PrismaService,
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
  ) {}

  async execute(taskId: string, sprintId: string | null): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { column: { include: { board: true } } },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (sprintId !== null) {
      const sprint = await this.sprintRepository.findById(sprintId);
      if (!sprint) {
        throw new BadRequestException('Sprint not found');
      }

      // Ensure sprint belongs to the same board as the task
      if (sprint.boardId !== task.column.boardId) {
        throw new BadRequestException(
          'Sprint must belong to the same board as the task',
        );
      }
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { sprintId: sprintId || null },
    });
  }
}
