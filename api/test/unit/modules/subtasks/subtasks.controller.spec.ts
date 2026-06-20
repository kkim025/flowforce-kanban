import { Test, TestingModule } from '@nestjs/testing';
import { SubtasksController } from 'src/modules/subtasks/subtasks.controller';
import { SubtasksService } from 'src/modules/subtasks/subtasks.service';
import { UpdateSubtaskUseCase } from 'src/modules/tasks/application/use-cases/update-subtask.use-case';

describe('SubtasksController', () => {
  let controller: SubtasksController;

  beforeEach(async () => {
    const mockSubtasksService = {};
    const mockUpdateSubtaskUseCase = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubtasksController],
      providers: [
        { provide: SubtasksService, useValue: mockSubtasksService },
        { provide: UpdateSubtaskUseCase, useValue: mockUpdateSubtaskUseCase },
      ],
    }).compile();

    controller = module.get<SubtasksController>(SubtasksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
