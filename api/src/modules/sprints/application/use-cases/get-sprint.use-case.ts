import { Inject, Injectable } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';

@Injectable()
export class GetSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private readonly sprintRepository: ISprintRepository,
  ) {}

  execute(id: string): Promise<Sprint | null> {
    return this.sprintRepository.findById(id);
  }
}
