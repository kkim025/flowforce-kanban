import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { ITaskRepository } from "../../domain/tasks.repository.interface";
import { Task } from "../../domain/task.entity";
import { Checklist } from "../../domain/checklist.entity";
import { Subtask } from "../../domain/subtask.entity";
import { TaskMapper } from "./task.mapper";
import { Prisma } from "@prisma/client";

type PrismaTaskWithRelations = Prisma.TaskGetPayload<{
  include: {
    subtasks: true;
    checklists: {
      include: {
        items: true;
      };
    };
  };
}>;

type PrismaChecklistWithItems = Prisma.ChecklistGetPayload<{
  include: {
    items: true;
  };
}>;

@Injectable()
export class PrismaTaskRepository implements ITaskRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Task | null> {
    const rawTask = await this.prisma.task.findUnique({
      where: { id },
      include: {
        subtasks: true,
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!rawTask) return null;

    return TaskMapper.toDomain(rawTask as PrismaTaskWithRelations);
  }

  async findAllByColumnId(columnId: string): Promise<Task[]> {
    const rawTasks = await this.prisma.task.findMany({
      where: { columnId },
      include: {
        subtasks: true,
        checklists: {
          include: {
            items: true,
          },
        },
      },
    });

    return rawTasks.map((task) => TaskMapper.toDomain(task as PrismaTaskWithRelations));
  }

  async save(task: Task): Promise<void> {
    const persistenceTask = TaskMapper.toPersistence(task) as Prisma.TaskUncheckedCreateInput;

    await this.prisma.task.upsert({
      where: { id: task.id },
      update: persistenceTask as Prisma.TaskUpdateInput,
      create: persistenceTask,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({
      where: { id },
    });
  }

  async findChecklistById(id: string): Promise<Checklist | null> {
    const rawChecklist = await this.prisma.checklist.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!rawChecklist) return null;

    return TaskMapper.checklistToDomain(rawChecklist as PrismaChecklistWithItems);
  }

  async saveChecklist(taskId: string, checklist: Checklist): Promise<void> {
    const persistenceChecklist = TaskMapper.checklistToPersistence(checklist, taskId) as Prisma.ChecklistUncheckedCreateInput;

    await this.prisma.checklist.upsert({
      where: { id: checklist.id },
      update: persistenceChecklist as Prisma.ChecklistUpdateInput,
      create: persistenceChecklist,
    });
  }

  async deleteChecklist(id: string): Promise<void> {
    await this.prisma.checklist.delete({
      where: { id },
    });
  }

  async findSubtaskById(id: string): Promise<Subtask | null> {
    const rawSubtask = await this.prisma.subtask.findUnique({
      where: { id },
    });

    if (!rawSubtask) return null;

    return TaskMapper.subtaskToDomain(rawSubtask);
  }

  async saveSubtask(taskId: string | null, checklistId: string | null, subtask: Subtask): Promise<void> {
    const persistenceSubtask = TaskMapper.subtaskToPersistence(subtask, taskId, checklistId) as Prisma.SubtaskUncheckedCreateInput;

    await this.prisma.subtask.upsert({
      where: { id: subtask.id },
      update: persistenceSubtask as Prisma.SubtaskUpdateInput,
      create: persistenceSubtask,
    });
  }

  async deleteSubtask(id: string): Promise<void> {
    await this.prisma.subtask.delete({
      where: { id },
    });
  }

  async findTaskBySubtaskId(subtaskId: string): Promise<Task | null> {
    const rawSubtask = await this.prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: {
          include: {
            subtasks: true,
            checklists: {
              include: { items: true },
            },
          },
        },
        checklist: {
          include: {
            task: {
              include: {
                subtasks: true,
                checklists: {
                  include: { items: true },
                },
              },
            },
          },
        },
      },
    });

    if (!rawSubtask) return null;

    const rawTask = rawSubtask.task || rawSubtask.checklist?.task;
    if (!rawTask) return null;

    return TaskMapper.toDomain(rawTask as PrismaTaskWithRelations);
  }
}
