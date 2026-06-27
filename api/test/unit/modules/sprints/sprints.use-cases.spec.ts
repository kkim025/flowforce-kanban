import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateSprintUseCase } from 'src/modules/sprints/application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from 'src/modules/sprints/application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from 'src/modules/sprints/application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from 'src/modules/sprints/application/use-cases/activate-sprint.use-case';
import { AssignTaskToSprintUseCase } from 'src/modules/sprints/application/use-cases/assign-task-to-sprint.use-case';
import { ArchiveSprintUseCase } from 'src/modules/sprints/application/use-cases/archive-sprint.use-case';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { SprintStatus } from 'src/modules/sprints/domain/sprint-status';

describe('Sprint Use Cases', () => {
  describe('CreateSprintUseCase', () => {
    let useCase: CreateSprintUseCase;
    let mockRepository: any;

    beforeEach(async () => {
      mockRepository = { save: jest.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          CreateSprintUseCase,
          { provide: 'ISprintRepository', useValue: mockRepository },
        ],
      }).compile();
      useCase = module.get(CreateSprintUseCase);
    });

    it('should create a sprint with PLANNING status', async () => {
      const dto = {
        name: 'Sprint 1',
        startDate: '2026-03-23T00:00:00Z',
        endDate: '2026-04-03T00:00:00Z',
        boardId: 'board-1',
      };

      mockRepository.save.mockResolvedValue(undefined);

      const result = await useCase.execute(dto);

      expect(result.name).toBe('Sprint 1');
      expect(result.status).toBe('PLANNING');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when name is empty', async () => {
      const dto = {
        name: '',
        startDate: '2026-03-23T00:00:00Z',
        endDate: '2026-04-03T00:00:00Z',
        boardId: 'board-1',
      } as any;

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is before startDate', async () => {
      const dto = {
        name: 'Sprint 1',
        startDate: '2026-04-03T00:00:00Z',
        endDate: '2026-03-23T00:00:00Z',
        boardId: 'board-1',
      };

      await expect(useCase.execute(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('UpdateSprintUseCase', () => {
    let useCase: UpdateSprintUseCase;
    let mockRepository: any;

    beforeEach(async () => {
      mockRepository = {
        findById: jest.fn(),
        save: jest.fn(),
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          UpdateSprintUseCase,
          { provide: 'ISprintRepository', useValue: mockRepository },
        ],
      }).compile();
      useCase = module.get(UpdateSprintUseCase);
    });

    it('should update sprint name', async () => {
      const existingSprint = createMockSprint({
        name: 'Old Name',
        status: 'PLANNING',
      });
      mockRepository.findById.mockResolvedValue(existingSprint);
      mockRepository.save.mockResolvedValue(undefined);

      await useCase.execute('sprint-1', { name: 'New Name' });

      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when sprint not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('non-existent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when editing COMPLETED sprint', async () => {
      const existingSprint = createMockSprint({
        name: 'Done',
        status: 'COMPLETED',
      });
      mockRepository.findById.mockResolvedValue(existingSprint);

      await expect(
        useCase.execute('sprint-1', { name: 'New Name' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when new endDate before startDate', async () => {
      const existingSprint = createMockSprint({
        name: 'Sprint',
        status: 'PLANNING',
        startDate: new Date('2026-03-23'),
        endDate: new Date('2026-04-03'),
      });
      mockRepository.findById.mockResolvedValue(existingSprint);

      await expect(
        useCase.execute('sprint-1', {
          startDate: '2026-04-05',
          endDate: '2026-03-23',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('DeleteSprintUseCase', () => {
    let useCase: DeleteSprintUseCase;
    let mockRepository: any;
    let mockPrisma: any;

    beforeEach(async () => {
      mockRepository = { findById: jest.fn() };
      mockPrisma = {
        $transaction: jest.fn((fn) => fn(mockPrisma)),
        task: { updateMany: jest.fn() },
        sprint: { delete: jest.fn() },
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeleteSprintUseCase,
          { provide: 'ISprintRepository', useValue: mockRepository },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      useCase = module.get(DeleteSprintUseCase);
    });

    it('should throw NotFoundException when sprint not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete sprint and unassign tasks', async () => {
      const existingSprint = createMockSprint({
        name: 'Sprint',
        status: 'PLANNING',
      });
      mockRepository.findById.mockResolvedValue(existingSprint);
      mockPrisma.task.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.sprint.delete.mockResolvedValue({});

      const result = await useCase.execute('sprint-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.task.updateMany).toHaveBeenCalledWith({
        where: { sprintId: 'sprint-1' },
        data: { sprintId: null },
      });
      expect(mockPrisma.sprint.delete).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
      });
    });
  });

  describe('ActivateSprintUseCase', () => {
    let useCase: ActivateSprintUseCase;
    let mockRepository: any;
    let mockPrisma: any;
    let eventEmitter: { emit: jest.Mock };

    beforeEach(async () => {
      mockRepository = { findById: jest.fn() };
      mockPrisma = {
        $transaction: jest.fn((fn) => fn(mockPrisma)),
        sprint: {
          updateMany: jest.fn(),
          update: jest.fn(),
          findUnique: jest.fn(),
        },
        board: {
          findUnique: jest.fn().mockResolvedValue({ ownerId: 'board-owner' }),
        },
      };
      eventEmitter = { emit: jest.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ActivateSprintUseCase,
          { provide: 'ISprintRepository', useValue: mockRepository },
          { provide: PrismaService, useValue: mockPrisma },
          { provide: EventEmitter2, useValue: eventEmitter },
        ],
      }).compile();
      useCase = module.get(ActivateSprintUseCase);
    });

    it('should throw NotFoundException when sprint not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when activating COMPLETED sprint', async () => {
      const sprint = createMockSprint({ name: 'Done', status: 'COMPLETED' });
      mockRepository.findById.mockResolvedValue(sprint);

      await expect(useCase.execute('sprint-1', 'actor-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should activate sprint and deactivate others on same board', async () => {
      const sprint = createMockSprint({
        name: 'Sprint 1',
        status: 'PLANNING',
        boardId: 'board-1',
      });
      mockRepository.findById.mockResolvedValue(sprint);
      mockRepository.findById.mockResolvedValueOnce(sprint);
      mockPrisma.sprint.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.sprint.update.mockResolvedValue({});
      mockPrisma.sprint.findUnique.mockResolvedValue({
        id: 'sprint-1',
        name: 'Sprint 1',
        status: 'ACTIVE',
        boardId: 'board-1',
        startDate: new Date(),
        endDate: new Date(),
      });

      await useCase.execute('sprint-1', 'actor-1');

      expect(mockPrisma.sprint.updateMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1', status: 'ACTIVE' },
        data: { status: 'COMPLETED' },
      });
      expect(mockPrisma.sprint.update).toHaveBeenCalledWith({
        where: { id: 'sprint-1' },
        data: { status: 'ACTIVE' },
      });
    });
  });

  describe('AssignTaskToSprintUseCase', () => {
    let useCase: AssignTaskToSprintUseCase;
    let mockRepository: any;
    let mockPrisma: any;

    beforeEach(async () => {
      mockRepository = { findById: jest.fn() };
      mockPrisma = {
        task: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
      };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AssignTaskToSprintUseCase,
          { provide: 'ISprintRepository', useValue: mockRepository },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      useCase = module.get(AssignTaskToSprintUseCase);
    });

    it('should throw NotFoundException when task not found', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(useCase.execute('non-existent', 'sprint-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when sprint belongs to different board', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        column: { boardId: 'board-1' },
      });
      mockRepository.findById.mockResolvedValue(
        createMockSprint({ id: 'sprint-1', boardId: 'board-2' }),
      );

      await expect(useCase.execute('task-1', 'sprint-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should assign task to sprint when sprint is on same board', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        column: { boardId: 'board-1' },
      });
      mockRepository.findById.mockResolvedValue(
        createMockSprint({ id: 'sprint-1', boardId: 'board-1' }),
      );
      mockPrisma.task.update.mockResolvedValue({});

      await useCase.execute('task-1', 'sprint-1');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { sprintId: 'sprint-1' },
      });
    });

    it('should unassign task when sprintId is null', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        column: { boardId: 'board-1' },
        sprintId: 'sprint-1',
      });
      mockPrisma.task.update.mockResolvedValue({});

      await useCase.execute('task-1', null);

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { sprintId: null },
      });
    });
  });

  describe('ArchiveSprintUseCase', () => {
    let sprintRepository: jest.Mocked<ISprintRepository>;
    let eventEmitter: { emit: jest.Mock };
    let mockPrisma: any;
    let useCase: ArchiveSprintUseCase;

    beforeEach(() => {
      sprintRepository = {
        findById: jest.fn(),
        save: jest.fn(),
        findByBoard: jest.fn(),
      };
      eventEmitter = { emit: jest.fn() };
      mockPrisma = {
        board: {
          findUnique: jest.fn().mockResolvedValue({ ownerId: 'board-owner' }),
        },
      };
      useCase = new ArchiveSprintUseCase(
        sprintRepository,
        mockPrisma,
        eventEmitter as any,
      );
    });

    it('should archive a sprint', async () => {
      const sprint = createMockSprint({ status: 'ACTIVE' });
      sprintRepository.findById.mockResolvedValue(sprint);
      sprintRepository.save.mockResolvedValue(sprint);

      const result = await useCase.execute('sprint-1', 'actor-1');

      expect(sprintRepository.save).toHaveBeenCalled();
      expect(result.props.status).toBe('ARCHIVED');
    });

    it('should return existing archived sprint (idempotent)', async () => {
      const sprint = createMockSprint({ status: 'ARCHIVED' });
      sprintRepository.findById.mockResolvedValue(sprint);

      await useCase.execute('sprint-1', 'actor-1');

      expect(sprintRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if sprint does not exist', async () => {
      sprintRepository.findById.mockResolvedValue(null);

      await expect(useCase.execute('sprint-1', 'actor-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

function createMockSprint(
  overrides: Partial<{
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: SprintStatus;
    boardId: string;
  }> = {},
): any {
  const id = overrides.id ?? 'sprint-1';
  const status = overrides.status ?? 'PLANNING';
  const boardId = overrides.boardId ?? 'board-1';
  const startDate = overrides.startDate ?? new Date('2026-03-23');
  const endDate = overrides.endDate ?? new Date('2026-04-03');
  const name = overrides.name ?? 'Sprint 1';

  const props = {
    name,
    startDate,
    endDate,
    status,
    boardId,
  };

  const sprint = {
    id,
    props,
    get boardId() {
      return boardId;
    },
    isActive: () => status === 'ACTIVE',
    isCompleted: () => status === 'COMPLETED',
    isPlanning: () => status === 'PLANNING',
  };
  return sprint;
}
