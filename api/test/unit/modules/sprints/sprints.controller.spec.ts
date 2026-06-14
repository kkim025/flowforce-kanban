import { Test, TestingModule } from '@nestjs/testing';
import { SprintsController } from 'src/modules/sprints/sprints.controller';
import { CreateSprintUseCase } from 'src/modules/sprints/application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from 'src/modules/sprints/application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from 'src/modules/sprints/application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from 'src/modules/sprints/application/use-cases/activate-sprint.use-case';
import { AssignTaskToSprintUseCase } from 'src/modules/sprints/application/use-cases/assign-task-to-sprint.use-case';
import { ArchiveSprintUseCase } from 'src/modules/sprints/application/use-cases/archive-sprint.use-case';
import { ListSprintsByBoardUseCase } from 'src/modules/sprints/application/use-cases/list-sprints-by-board.use-case';
import { GetActiveSprintUseCase } from 'src/modules/sprints/application/use-cases/get-active-sprint.use-case';
import { GetSprintUseCase } from 'src/modules/sprints/application/use-cases/get-sprint.use-case';

describe('SprintsController', () => {
  let controller: SprintsController;
  let listSprintsByBoard: { execute: jest.Mock };
  let getActiveSprint: { execute: jest.Mock };
  let getSprint: { execute: jest.Mock };

  beforeEach(async () => {
    listSprintsByBoard = { execute: jest.fn() };
    getActiveSprint = { execute: jest.fn() };
    getSprint = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SprintsController],
      providers: [
        { provide: CreateSprintUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateSprintUseCase, useValue: { execute: jest.fn() } },
        { provide: DeleteSprintUseCase, useValue: { execute: jest.fn() } },
        { provide: ActivateSprintUseCase, useValue: { execute: jest.fn() } },
        {
          provide: AssignTaskToSprintUseCase,
          useValue: { execute: jest.fn() },
        },
        { provide: ArchiveSprintUseCase, useValue: { execute: jest.fn() } },
        {
          provide: ListSprintsByBoardUseCase,
          useValue: listSprintsByBoard,
        },
        { provide: GetActiveSprintUseCase, useValue: getActiveSprint },
        { provide: GetSprintUseCase, useValue: getSprint },
      ],
    }).compile();

    controller = module.get<SprintsController>(SprintsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list sprints by board via ListSprintsByBoardUseCase', async () => {
    const mockSprints = [
      { id: 's1', name: 'Sprint 1', boardId: 'board-1', status: 'ACTIVE' },
    ];
    listSprintsByBoard.execute.mockResolvedValue(mockSprints);

    const result = await controller.findByBoard('board-1');

    expect(result).toEqual(mockSprints);
    expect(listSprintsByBoard.execute).toHaveBeenCalledWith('board-1');
  });

  it('should get active sprint for a board via GetActiveSprintUseCase', async () => {
    const mockSprint = {
      id: 's1',
      name: 'Sprint 1',
      boardId: 'board-1',
      status: 'ACTIVE',
    };
    getActiveSprint.execute.mockResolvedValue(mockSprint);

    const result = await controller.findActiveByBoard('board-1');

    expect(result).toEqual(mockSprint);
    expect(getActiveSprint.execute).toHaveBeenCalledWith('board-1');
  });

  it('should get sprint by id via GetSprintUseCase', async () => {
    const mockSprint = {
      id: 's1',
      name: 'Sprint 1',
      boardId: 'board-1',
      status: 'PLANNING',
    };
    getSprint.execute.mockResolvedValue(mockSprint);

    const result = await controller.findOne('s1');

    expect(result).toEqual(mockSprint);
    expect(getSprint.execute).toHaveBeenCalledWith('s1');
  });
});
