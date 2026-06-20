import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ITaskRepository } from '../../domain/tasks.repository.interface';
import type { IBoardRepository } from '../../../boards/domain/boards.repository.interface';
import { UpdateSubtaskDto } from '../dto/update-subtask.dto';
import { Subtask } from '../../domain/subtask.entity';
import { Task } from '../../domain/task.entity';

@Injectable()
export class UpdateSubtaskUseCase {
  constructor(
    @Inject('ITaskRepository')
    private taskRepository: ITaskRepository,
    @Inject('IBoardRepository')
    private boardRepository: IBoardRepository,
  ) {}

  async execute(
    userId: string,
    id: string,
    dto: UpdateSubtaskDto,
  ): Promise<Subtask> {
    const task = await this.taskRepository.findTaskBySubtaskId(id);
    if (!task) {
      throw new NotFoundException(
        `Parent task for subtask with ID ${id} not found`,
      );
    }

    const boardId = await this.getBoardIdFromTask(task);
    const board = await this.boardRepository.findById(boardId);
    if (!board || board.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const subtask = await this.taskRepository.findSubtaskById(id);
    if (!subtask) {
      throw new NotFoundException(`Subtask with ID ${id} not found`);
    }

    subtask.update({
      content: dto.content,
      completed: dto.completed,
    });

    await this.taskRepository.saveSubtask(null, null, subtask);

    return subtask;
  }

  private async getBoardIdFromTask(task: Task): Promise<string> {
    const column = await this.boardRepository.findColumnById(task.columnId);
    if (!column) throw new NotFoundException('Column not found');
    const columnProps = column.props as Record<string, unknown>;
    return columnProps.boardId as string;
  }
}
