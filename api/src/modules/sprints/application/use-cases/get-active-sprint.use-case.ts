import { Inject, Injectable } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';

@Injectable()
export class GetActiveSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private readonly sprintRepository: ISprintRepository,
  ) {}

  execute(boardId: string): Promise<Sprint | null> {
    return this.sprintRepository.findActiveByBoardId(boardId);
  }
}
