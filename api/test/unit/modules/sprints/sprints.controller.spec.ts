import { Test, TestingModule } from '@nestjs/testing';
import { SprintsController } from 'src/modules/sprints/sprints.controller';
import { CreateSprintUseCase } from 'src/modules/sprints/application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from 'src/modules/sprints/application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from 'src/modules/sprints/application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from 'src/modules/sprints/application/use-cases/activate-sprint.use-case';
import { AssignTaskToSprintUseCase } from 'src/modules/sprints/application/use-cases/assign-task-to-sprint.use-case';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('SprintsController', () => {
  let controller: SprintsController;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      sprint: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      task: {
        update: jest.fn(),
      },
    };

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
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    controller = module.get<SprintsController>(SprintsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should list sprints by board', async () => {
    const mockSprints = [
      { id: 's1', name: 'Sprint 1', boardId: 'board-1', status: 'ACTIVE' },
    ];
    mockPrisma.sprint.findMany.mockResolvedValue(mockSprints);

    const result = await controller.findByBoard('board-1');

    expect(result).toEqual(mockSprints);
    expect(mockPrisma.sprint.findMany).toHaveBeenCalledWith({
      where: { boardId: 'board-1' },
      orderBy: { startDate: 'asc' },
    });
  });

  it('should get active sprint for a board', async () => {
    const mockSprint = {
      id: 's1',
      name: 'Sprint 1',
      boardId: 'board-1',
      status: 'ACTIVE',
    };
    mockPrisma.sprint.findFirst.mockResolvedValue(mockSprint);

    const result = await controller.findActiveByBoard('board-1');

    expect(result).toEqual(mockSprint);
    expect(mockPrisma.sprint.findFirst).toHaveBeenCalledWith({
      where: { boardId: 'board-1', status: 'ACTIVE' },
    });
  });

  it('should get sprint by id', async () => {
    const mockSprint = {
      id: 's1',
      name: 'Sprint 1',
      boardId: 'board-1',
      status: 'PLANNING',
    };
    mockPrisma.sprint.findUnique.mockResolvedValue(mockSprint);

    const result = await controller.findOne('s1');

    expect(result).toEqual(mockSprint);
    expect(mockPrisma.sprint.findUnique).toHaveBeenCalledWith({
      where: { id: 's1' },
    });
  });
});
