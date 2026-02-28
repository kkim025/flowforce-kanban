import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;

  const mockColumn = {
    id: 'col-1',
    board: { ownerId: 'user-1' },
  };

  const mockTask = {
    id: 'task-1',
    content: 'Test Task',
    columnId: 'col-1',
    column: { board: { ownerId: 'user-1' } },
  };

  beforeEach(async () => {
    const mockPrisma = {
      column: { findUnique: jest.fn() },
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create task if user owns board', async () => {
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      prisma.task.create.mockResolvedValue(mockTask);

      const result = await service.create('user-1', {
        content: 'Test Task',
        columnId: 'col-1',
        order: 0,
      });

      expect(result.content).toBe('Test Task');
      expect(prisma.task.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not own board', async () => {
      prisma.column.findUnique.mockResolvedValue(mockColumn);
      await expect(service.create('user-2', {
        content: 'Test Task',
        columnId: 'col-1',
        order: 0,
      })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should move task between columns if owner', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.column.findUnique.mockResolvedValue({ id: 'col-2', board: { ownerId: 'user-1' } });
      prisma.task.update.mockResolvedValue({ ...mockTask, columnId: 'col-2' });

      const result = await service.update('user-1', 'task-1', { columnId: 'col-2' });
      expect(result.columnId).toBe('col-2');
    });
  });
});
