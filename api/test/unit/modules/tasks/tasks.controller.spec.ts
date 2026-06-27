import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from 'src/modules/tasks/tasks.controller';
import { TasksService } from 'src/modules/tasks/tasks.service';
import { ChecklistsService } from 'src/modules/checklists/checklists.service';
import { CreateTaskUseCase } from 'src/modules/tasks/application/use-cases/create-task.use-case';
import { MoveTaskUseCase } from 'src/modules/tasks/application/use-cases/move-task.use-case';
import { AddChecklistUseCase } from 'src/modules/tasks/application/use-cases/add-checklist.use-case';

describe('TasksController', () => {
  let controller: TasksController;

  beforeEach(async () => {
    const mockTasksService = {};
    const mockChecklistsService = {};
    const mockCreateTaskUseCase = {};
    const mockMoveTaskUseCase = {};
    const mockAddChecklistUseCase = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        { provide: TasksService, useValue: mockTasksService },
        { provide: ChecklistsService, useValue: mockChecklistsService },
        { provide: CreateTaskUseCase, useValue: mockCreateTaskUseCase },
        { provide: MoveTaskUseCase, useValue: mockMoveTaskUseCase },
        { provide: AddChecklistUseCase, useValue: mockAddChecklistUseCase },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
