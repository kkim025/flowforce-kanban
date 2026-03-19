import { Task } from './task.entity';
import { Checklist } from './checklist.entity';
import { Subtask } from './subtask.entity';

export interface ITaskRepository {
  findById(id: string): Promise<Task | null>;
  findAllByColumnId(columnId: string): Promise<Task[]>;
  save(task: Task): Promise<void>;
  delete(id: string): Promise<void>;

  // Specific methods for child entities
  findChecklistById(id: string): Promise<Checklist | null>;
  saveChecklist(taskId: string, checklist: Checklist): Promise<void>;
  deleteChecklist(id: string): Promise<void>;

  findSubtaskById(id: string): Promise<Subtask | null>;
  saveSubtask(
    taskId: string | null,
    checklistId: string | null,
    subtask: Subtask,
  ): Promise<void>;
  deleteSubtask(id: string): Promise<void>;

  findTaskBySubtaskId(subtaskId: string): Promise<Task | null>;
}
