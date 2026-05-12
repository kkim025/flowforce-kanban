import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SubtasksService } from 'src/modules/subtasks/subtasks.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('SubtasksService', () => {
  let service: SubtasksService;
  let mockPrisma: any;

  const mockBoard = { id: 'board-1', ownerId: 'user-1' };
  const mockColumn = { id: 'col-1', boardId: 'board-1', board: mockBoard };
  const mockTask = { id: 'task-1', columnId: 'col-1', column: mockColumn };
  const mockChecklist = { id: 'cl-1', taskId: 'task-1', task: mockTask };
  const mockSubtask = { id: 'st-1', content: 'Subtask 1', completed: false, checklistId: 'cl-1' };

  beforeEach(async () => {
    mockPrisma = {
      subtask: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      checklist: {
        findUnique: jest.fn(),
      },
      task: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubtasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubtasksService>(SubtasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a subtask with checklistId', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      mockPrisma.subtask.create.mockResolvedValue(mockSubtask);

      const result = await service.create('user-1', { content: 'Subtask 1', checklistId: 'cl-1' });

      expect(result).toEqual(mockSubtask);
      expect(mockPrisma.subtask.create).toHaveBeenCalledWith({
        data: { content: 'Subtask 1', checklistId: 'cl-1', taskId: undefined },
      });
    });

    it('should throw ForbiddenException if user does not own the checklist', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue({
        ...mockChecklist,
        task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } },
      });

      await expect(service.create('user-1', { content: 'Subtask 1', checklistId: 'cl-1' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if checklist not found', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.create('user-1', { content: 'Subtask 1', checklistId: 'cl-1' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw error if neither taskId nor checklistId provided', async () => {
      await expect(service.create('user-1', { content: 'Subtask 1' }))
        .rejects.toThrow('Either taskId or checklistId must be provided');
    });
  });

  describe('update', () => {
    it('should update a subtask', async () => {
      const updatedSubtask = { ...mockSubtask, content: 'Updated', completed: true };
      mockPrisma.subtask.findUnique.mockResolvedValue({ ...mockSubtask, checklist: mockChecklist });
      mockPrisma.subtask.update.mockResolvedValue(updatedSubtask);

      const result = await service.update('user-1', 'st-1', { content: 'Updated', completed: true });

      expect(result.content).toBe('Updated');
      expect(result.completed).toBe(true);
    });

    it('should throw NotFoundException if subtask not found', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', 'st-1', { content: 'Updated' }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue({
        ...mockSubtask,
        checklist: { ...mockChecklist, task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } } },
      });

      await expect(service.update('user-1', 'st-1', { content: 'Updated' }))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue({ ...mockSubtask, checklist: mockChecklist });
      mockPrisma.subtask.delete.mockResolvedValue(mockSubtask);

      const result = await service.remove('user-1', 'st-1');

      expect(result).toEqual(mockSubtask);
      expect(mockPrisma.subtask.delete).toHaveBeenCalledWith({ where: { id: 'st-1' } });
    });

    it('should throw NotFoundException if subtask not found', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'st-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue({
        ...mockSubtask,
        checklist: { ...mockChecklist, task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } } },
      });

      await expect(service.remove('user-1', 'st-1'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggle', () => {
    it('should toggle subtask completed status from false to true', async () => {
      const subtaskFalse = { ...mockSubtask, completed: false };
      const subtaskTrue = { ...mockSubtask, completed: true };
      mockPrisma.subtask.findUnique.mockResolvedValue({ ...subtaskFalse, checklist: mockChecklist });
      mockPrisma.subtask.update.mockResolvedValue(subtaskTrue);

      const result = await service.toggle('user-1', 'st-1');

      expect(result.completed).toBe(true);
    });

    it('should toggle subtask completed status from true to false', async () => {
      const subtaskTrue = { ...mockSubtask, completed: true };
      const subtaskFalse = { ...mockSubtask, completed: false };
      mockPrisma.subtask.findUnique.mockResolvedValue({ ...subtaskTrue, checklist: mockChecklist });
      mockPrisma.subtask.update.mockResolvedValue(subtaskFalse);

      const result = await service.toggle('user-1', 'st-1');

      expect(result.completed).toBe(false);
    });

    it('should throw NotFoundException if subtask not found', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue(null);

      await expect(service.toggle('user-1', 'st-1'))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the subtask', async () => {
      mockPrisma.subtask.findUnique.mockResolvedValue({
        ...mockSubtask,
        checklist: { ...mockChecklist, task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } } },
      });

      await expect(service.toggle('user-1', 'st-1'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorder', () => {
    it('should reorder subtasks', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(mockChecklist);
      mockPrisma.subtask.update.mockResolvedValue({});
      mockPrisma.$transaction.mockImplementation(async (updates) => {
        // Simulate transaction execution
        return updates.map(() => ({}));
      });

      await service.reorder('user-1', 'cl-1', ['st-1', 'st-2', 'st-3']);

      expect(mockPrisma.checklist.findUnique).toHaveBeenCalledWith({
        where: { id: 'cl-1' },
        include: expect.any(Object),
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user does not own the checklist', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue({
        ...mockChecklist,
        task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } },
      });

      await expect(service.reorder('user-1', 'cl-1', ['st-1', 'st-2']))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if checklist not found', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.reorder('user-1', 'cl-1', ['st-1', 'st-2']))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByChecklist', () => {
    it('should return subtasks ordered by order field', async () => {
      const subtasks = [
        { id: 'st-1', content: 'Subtask 1', completed: false, order: 0 },
        { id: 'st-2', content: 'Subtask 2', completed: true, order: 1 },
      ];
      mockPrisma.subtask.findMany.mockResolvedValue(subtasks);

      const result = await service.findAllByChecklist('cl-1');

      expect(result).toEqual(subtasks);
      expect(mockPrisma.subtask.findMany).toHaveBeenCalledWith({
        where: { checklistId: 'cl-1' },
        orderBy: { order: 'asc' },
      });
    });
  });

  describe('checkChecklistOwnership', () => {
    it('should return checklist when user is owner', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(mockChecklist);

      const result = await service.checkChecklistOwnership('user-1', 'cl-1');

      expect(result).toEqual(mockChecklist);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue({
        ...mockChecklist,
        task: { ...mockTask, column: { ...mockColumn, board: { ...mockBoard, ownerId: 'other-user' } } },
      });

      await expect(service.checkChecklistOwnership('user-1', 'cl-1'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if checklist not found', async () => {
      mockPrisma.checklist.findUnique.mockResolvedValue(null);

      await expect(service.checkChecklistOwnership('user-1', 'cl-1'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
