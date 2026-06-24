import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { PrismaService } from '../../../../common/prisma/prisma.service';

@Injectable()
export class DeleteSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
    private prisma: PrismaService,
  ) {}

  async execute(sprintId: string): Promise<{ success: boolean }> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Unassign all tasks from this sprint
      await tx.task.updateMany({
        where: { sprintId },
        data: { sprintId: null },
      });
      // Delete the sprint
      await tx.sprint.delete({ where: { id: sprintId } });
    });

    return { success: true };
  }
}
