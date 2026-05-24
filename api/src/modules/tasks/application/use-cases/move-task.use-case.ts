import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { ITaskRepository } from '../../domain/tasks.repository.interface';
import type { IBoardRepository } from '../../../boards/domain/boards.repository.interface';
import { Task } from '../../domain/task.entity';

@Injectable()
export class MoveTaskUseCase {
  constructor(
    @Inject('ITaskRepository')
    private taskRepository: ITaskRepository,
    @Inject('IBoardRepository')
    private boardRepository: IBoardRepository,
  ) {}

  async execute(
    taskId: string,
    targetColumnId: string,
    order: number,
  ): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const column = await this.boardRepository.findColumnById(targetColumnId);
    if (!column) {
      throw new NotFoundException(`Column with ID ${targetColumnId} not found`);
    }

    task.move(targetColumnId, order);
    await this.taskRepository.save(task);

    return task;
  }
}
