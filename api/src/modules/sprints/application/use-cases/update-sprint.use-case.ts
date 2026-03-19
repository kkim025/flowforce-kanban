import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';
import { UpdateSprintDto } from '../dto/update-sprint.dto';

@Injectable()
export class UpdateSprintUseCase {
  constructor(
    @Inject('ISprintRepository')
    private sprintRepository: ISprintRepository,
  ) {}

  async execute(sprintId: string, dto: UpdateSprintDto): Promise<Sprint> {
    const sprint = await this.sprintRepository.findById(sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    if (sprint.isCompleted()) {
      throw new ConflictException('Cannot edit a completed sprint');
    }

    // Validate dates if provided
    const newStartDate = dto.startDate
      ? new Date(dto.startDate)
      : sprint.startDate;
    const newEndDate = dto.endDate ? new Date(dto.endDate) : sprint.endDate;
    if (newEndDate <= newStartDate) {
      throw new BadRequestException('End date must be after start date');
    }

    const updatedSprintResult = Sprint.create(
      {
        name: dto.name !== undefined ? dto.name.trim() : sprint.name,
        startDate: dto.startDate ? new Date(dto.startDate) : sprint.startDate,
        endDate: dto.endDate ? new Date(dto.endDate) : sprint.endDate,
        status: dto.status || sprint.status,
        boardId: sprint.boardId,
      },
      sprint.id,
    );

    if (updatedSprintResult.isFailure) {
      throw new BadRequestException(
        String(updatedSprintResult.error as unknown),
      );
    }

    const updatedSprint = updatedSprintResult.getValue();
    await this.sprintRepository.save(updatedSprint);
    return updatedSprint;
  }
}
