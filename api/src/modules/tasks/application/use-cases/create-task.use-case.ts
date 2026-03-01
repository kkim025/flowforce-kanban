import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type { ITaskRepository } from "../../domain/tasks.repository.interface";
import { CreateTaskDto } from "../dto/create-task.dto";
import { Task } from "../../domain/task.entity";
import type { IBoardRepository } from "../../../boards/domain/boards.repository.interface";

@Injectable()
export class CreateTaskUseCase {
  constructor(
    @Inject("ITaskRepository")
    private taskRepository: ITaskRepository,
    @Inject("IBoardRepository")
    private boardRepository: IBoardRepository
  ) {}

  async execute(dto: CreateTaskDto): Promise<Task> {
    const column = await this.boardRepository.findColumnById(dto.columnId);
    if (!column) {
      throw new NotFoundException(`Column with ID ${dto.columnId} not found`);
    }

    const taskResult = Task.create({
      content: dto.content,
      description: dto.description,
      priority: dto.priority,
      order: dto.order,
      columnId: dto.columnId,
    });

    if (taskResult.isFailure) {
      throw new Error(String(taskResult.error));
    }

    const task = taskResult.getValue();
    await this.taskRepository.save(task);

    return task;
  }
}
