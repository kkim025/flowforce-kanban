import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';
import { CreateSprintDto } from '../dto/create-sprint.dto';

@Injectable()
export class CreateSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
  ) {}

  async execute(dto: CreateSprintDto): Promise<Sprint> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new BadRequestException('Sprint name is required');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const sprintResult = Sprint.create({
      name: dto.name.trim(),
      startDate,
      endDate,
      status: dto.status || 'PLANNING',
      boardId: dto.boardId,
      color: dto.color || undefined,
    });

    if (sprintResult.isFailure) {
      throw new BadRequestException(String(sprintResult.error as unknown));
    }

    const sprint = sprintResult.getValue();
    await this.sprintRepository.save(sprint);
    return sprint;
  }
}
