import { Inject, Injectable } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';

/**
 * Returns the non-archived sprints for a board, ordered by start date.
 * The board-scoped "active only" view used by the kanban UI.
 */
@Injectable()
export class ListSprintsByBoardUseCase {
  constructor(
    @Inject('ISprintRepository')
    private readonly sprintRepository: ISprintRepository,
  ) {}

  execute(boardId: string): Promise<Sprint[]> {
    return this.sprintRepository.findByBoardId(boardId, {
      includeArchived: false,
    });
  }
}
