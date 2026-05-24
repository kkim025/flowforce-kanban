import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { Sprint } from '../../domain/sprint.entity';
import { SprintStatus } from '../../domain/sprint-status';

@Injectable()
export class ActivateSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
    private prisma: PrismaService,
  ) {}

  async execute(sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.isCompleted()) {
      throw new ConflictException('Cannot activate a completed sprint');
    }

    await this.prisma.$transaction(async (tx) => {
      // Deactivate all other sprints on the same board
      await tx.sprint.updateMany({
        where: { boardId: sprint.boardId, status: SprintStatus.ACTIVE },
        data: { status: SprintStatus.COMPLETED },
      });
      // Activate this sprint
      await tx.sprint.update({
        where: { id: sprintId },
        data: { status: SprintStatus.ACTIVE },
      });
    });

    const updatedSprint = await this.sprintRepository.findById(sprintId);
    return updatedSprint!;
  }
}
