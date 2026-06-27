import {
  Task as PrismaTask,
  Subtask as PrismaSubtask,
  Checklist as PrismaChecklist,
  Priority as PrismaPriority,
} from '@prisma/client';
import { Task, Priority } from '../../domain/task.entity';
import { Subtask } from '../../domain/subtask.entity';
import { Checklist } from '../../domain/checklist.entity';

export class TaskMapper {
  public static toDomain(
    raw: PrismaTask & {
      subtasks?: PrismaSubtask[];
      checklists?: (PrismaChecklist & { items?: PrismaSubtask[] })[];
    },
  ): Task {
    const subtasks = raw.subtasks
      ? raw.subtasks.map((st) => this.subtaskToDomain(st))
      : [];
    const checklists = raw.checklists
      ? raw.checklists.map((cl) => this.checklistToDomain(cl))
      : [];

    const taskResult = Task.create(
      {
        content: raw.content,
        description: raw.description || undefined,
        priority: raw.priority as unknown as Priority,
        tags: raw.tags,
        order: raw.order,
        columnId: raw.columnId,
        archived: raw.archived,
        assigneeId: raw.assigneeId || undefined,
        subtasks: subtasks,
        checklists: checklists,
      },
      raw.id,
    );

    if (taskResult.isFailure) {
      throw new Error(`Task mapping error: ${taskResult.error}`);
    }

    return taskResult.getValue();
  }

  public static subtaskToDomain(raw: PrismaSubtask): Subtask {
    const subtaskResult = Subtask.create(
      {
        content: raw.content,
        completed: raw.completed,
      },
      raw.id,
    );

    if (subtaskResult.isFailure) {
      throw new Error(`Subtask mapping error: ${subtaskResult.error}`);
    }

    return subtaskResult.getValue();
  }

  public static checklistToDomain(
    raw: PrismaChecklist & { items?: PrismaSubtask[] },
  ): Checklist {
    const items = raw.items
      ? raw.items.map((st) => this.subtaskToDomain(st))
      : [];

    const checklistResult = Checklist.create(
      {
        title: raw.title,
        items: items,
      },
      raw.id,
    );

    if (checklistResult.isFailure) {
      throw new Error(`Checklist mapping error: ${checklistResult.error}`);
    }

    return checklistResult.getValue();
  }

  public static toPersistence(task: Task): Partial<PrismaTask> {
    return {
      id: task.id,
      content: task.content,
      description: task.description || null,
      priority: task.priority as unknown as PrismaPriority,
      tags: task.tags,
      order: task.order,
      columnId: task.columnId,
      archived: task.archived,
      assigneeId: task.assigneeId || null,
    };
  }

  public static subtaskToPersistence(
    subtask: Subtask,
    taskId: string | null,
    checklistId: string | null,
  ): Partial<PrismaSubtask> {
    return {
      id: subtask.id,
      content: subtask.content,
      completed: subtask.completed,
      taskId: taskId,
      checklistId: checklistId,
    };
  }

  public static checklistToPersistence(
    checklist: Checklist,
    taskId: string,
  ): Partial<PrismaChecklist> {
    return {
      id: checklist.id,
      title: checklist.title,
      taskId: taskId,
    };
  }
}
