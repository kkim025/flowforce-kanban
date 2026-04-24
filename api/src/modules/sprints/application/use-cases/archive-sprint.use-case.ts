import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';

@Injectable()
export class ArchiveSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
  ) {}

  async execute(sprintId: string): Promise<Sprint> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    // If already archived, return as-is (idempotent)
    if (sprint.props.status === 'ARCHIVED') {
      return sprint;
    }

    const archivedResult = Sprint.create(
      {
        ...sprint.props,
        status: 'ARCHIVED',
      },
      sprint.id,
    );

    if (archivedResult.isFailure) {
      throw new Error(String(archivedResult.error));
    }

    const archivedSprint = archivedResult.getValue();
    await this.sprintRepository.save(archivedSprint);
    return archivedSprint;
  }
}
