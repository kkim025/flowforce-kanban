import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TasksService } from 'src/modules/tasks/tasks.service';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { Comment } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  let mockPrisma: any;
  let eventEmitter: { emit: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      task: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
      column: {
        findUnique: jest.fn(),
      },
      comment: { create: jest.fn() },
      activity: { create: jest.fn() },
      user: { findMany: jest.fn() },
      tag: { findUnique: jest.fn() },
      taskTag: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    // Default: $transaction invokes the callback with mockPrisma as the
    // transaction client. Tests that exercise the tag reconciliation path
    // override this with a real callback.
    mockPrisma.$transaction = jest.fn(async (cb: (tx: any) => any) =>
      cb(mockPrisma),
    );
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update — task.assigned event', () => {
    it('emits task.assigned when assigneeId changes to a new user', async () => {
      const task = {
        id: 't1',
        content: 'Fix bug',
        columnId: 'c1',
        column: { boardId: 'b1', board: { ownerId: 'actor' } },
        assigneeId: 'oldUser',
        priority: 'MEDIUM',
      };
      const updated = { ...task, assigneeId: 'newUser' };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.task.update.mockResolvedValue(updated);

      await service.update('actor', 't1', { assigneeId: 'newUser' });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.assigned',
        expect.objectContaining({
          taskId: 't1',
          prevAssigneeId: 'oldUser',
          newAssigneeId: 'newUser',
          actorId: 'actor',
          boardId: 'b1',
          taskContent: 'Fix bug',
        }),
      );
    });

    it('does not emit when assigneeId is unchanged', async () => {
      const task = {
        id: 't1',
        content: 'Fix bug',
        columnId: 'c1',
        column: { boardId: 'b1', board: { ownerId: 'actor' } },
        assigneeId: 'u1',
        priority: 'MEDIUM',
      };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.task.update.mockResolvedValue(task);

      await service.update('actor', 't1', { assigneeId: 'u1' });

      const emitted = eventEmitter.emit.mock.calls.find(
        (c) => c[0] === 'task.assigned',
      );
      expect(emitted).toBeUndefined();
    });

    it('does not emit when assigneeId is explicitly null (unchanged)', async () => {
      const task = {
        id: 't1',
        content: 'Fix bug',
        columnId: 'c1',
        column: { boardId: 'b1', board: { ownerId: 'actor' } },
        assigneeId: null,
        priority: 'MEDIUM',
      };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.task.update.mockResolvedValue(task);

      await service.update('actor', 't1', { assigneeId: null });

      const emitted = eventEmitter.emit.mock.calls.find(
        (c) => c[0] === 'task.assigned',
      );
      expect(emitted).toBeUndefined();
    });
  });

  describe('addComment — comment.created event with mentions', () => {
    it('parses @mentions, stores them, and emits comment.created', async () => {
      const task = {
        id: 't1',
        content: 'Fix bug',
        column: { boardId: 'b1', board: { ownerId: 'actor' } },
      };
      const createdComment: Comment = {
        id: 'c1',
        content: 'hi @alice and @bob',
        taskId: 't1',
        userId: 'actor',
        mentionedUserIds: ['u-alice', 'u-bob'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-alice', name: 'Alice' },
        { id: 'u-bob', name: 'Bob' },
      ]);
      mockPrisma.comment.create.mockResolvedValue(createdComment);

      await service.addComment('actor', 't1', 'hi @alice and @bob');

      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          content: 'hi @alice and @bob',
          taskId: 't1',
          userId: 'actor',
          mentionedUserIds: ['u-alice', 'u-bob'],
        }),
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'comment.created',
        expect.objectContaining({
          commentId: 'c1',
          taskId: 't1',
          actorId: 'actor',
          mentionedUserIds: ['u-alice', 'u-bob'],
          boardId: 'b1',
          taskContent: 'Fix bug',
        }),
      );
    });

    it('emits comment.created with empty mentionedUserIds when there are no @mentions', async () => {
      const task = {
        id: 't1',
        content: 'Fix bug',
        column: { boardId: 'b1', board: { ownerId: 'actor' } },
      };
      const createdComment: Comment = {
        id: 'c1',
        content: 'plain text',
        taskId: 't1',
        userId: 'actor',
        mentionedUserIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.task.findUnique.mockResolvedValue(task);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.comment.create.mockResolvedValue(createdComment);

      await service.addComment('actor', 't1', 'plain text');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'comment.created',
        expect.objectContaining({ mentionedUserIds: [] }),
      );
    });
  });
});
