import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ITaskRepository } from '../../domain/tasks.repository.interface';
import type { IBoardRepository } from '../../../boards/domain/boards.repository.interface';
import { AddChecklistDto } from '../dto/add-checklist.dto';
import { Checklist } from '../../domain/checklist.entity';

@Injectable()
export class AddChecklistUseCase {
  constructor(
    @Inject('ITaskRepository')
    private taskRepository: ITaskRepository,
    @Inject('IBoardRepository')
    private boardRepository: IBoardRepository,
  ) {}

  async execute(userId: string, dto: AddChecklistDto): Promise<Checklist> {
    const task = await this.taskRepository.findById(dto.taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${dto.taskId} not found`);
    }

    const column = await this.boardRepository.findColumnById(task.columnId);
    if (!column) throw new NotFoundException('Column not found');

    // Using Record<string, unknown> to avoid 'any'
    const columnProps = column.props as Record<string, unknown>;
    const boardId = columnProps.boardId as string;

    const board = await this.boardRepository.findById(boardId);
    if (!board || board.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const checklistResult = Checklist.create({
      title: dto.title,
      items: [],
    });

    if (checklistResult.isFailure) {
      throw new Error(String(checklistResult.error));
    }

    const checklist = checklistResult.getValue();
    await this.taskRepository.saveChecklist(task.id, checklist);

    return checklist;
  }
}
