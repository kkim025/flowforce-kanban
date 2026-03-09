import { Test, TestingModule } from '@nestjs/testing';
import { ChecklistsService } from 'src/modules/checklists/checklists.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ChecklistsService', () => {
  let service: ChecklistsService;
  let prisma: any;

  const mockUser = { id: 'user-1' };
  const mockTask = {
    id: 'task-1',
    column: {
      board: {
        ownerId: 'user-1',
      },
    },
  };
  const mockChecklist = {
    id: 'cl-1',
    title: 'Test Checklist',
    taskId: 'task-1',
    task: mockTask,
  };

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findUnique: jest.fn(),
      },
      checklist: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChecklistsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ChecklistsService>(ChecklistsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a checklist if task ownership is verified', async () => {
      prisma.task.findUnique.mockResolvedValue(mockTask);
      prisma.checklist.create.mockResolvedValue(mockChecklist);

      const result = await service.create(mockUser.id, { title: 'New List', taskId: 'task-1' });

      expect(result).toEqual(mockChecklist);
      expect(prisma.task.findUnique).toHaveBeenCalled();
      expect(prisma.checklist.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not own the task', async () => {
      prisma.task.findUnique.mockResolvedValue({
        ...mockTask,
        column: { board: { ownerId: 'other-user' } },
      });

      await expect(service.create(mockUser.id, { title: 'New List', taskId: 'task-1' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete checklist if owner', async () => {
      prisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      prisma.checklist.delete.mockResolvedValue(mockChecklist);

      const result = await service.remove(mockUser.id, 'cl-1');

      expect(result).toEqual(mockChecklist);
      expect(prisma.checklist.delete).toHaveBeenCalledWith({ where: { id: 'cl-1' } });
    });

    it('should throw NotFoundException if checklist doesn\'t exist', async () => {
      prisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, 'cl-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
