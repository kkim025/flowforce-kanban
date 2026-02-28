import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from './boards.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: any;

  const mockBoard = {
    id: 'board-1',
    title: 'Test Board',
    ownerId: 'user-1',
    columns: [],
  };

  beforeEach(async () => {
    const mockPrisma = {
      board: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('should create a board', async () => {
      prisma.board.create.mockResolvedValue(mockBoard);
      const result = await service.create('user-1', 'Test Board');
      expect(result.title).toBe('Test Board');
      expect(prisma.board.create).toHaveBeenCalledWith({
        data: { title: 'Test Board', ownerId: 'user-1' },
        include: { columns: true },
      });
    });
  });

  describe('findOne', () => {
    it('should return board if user is owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      const result = await service.findOne('user-1', 'board-1');
      expect(result).toEqual(mockBoard);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      await expect(service.findOne('user-2', 'board-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if board not found', async () => {
      prisma.board.findUnique.mockResolvedValue(null);
      await expect(service.findOne('user-1', 'board-none')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update board if owner', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.board.update.mockResolvedValue({ ...mockBoard, title: 'New Title' });

      const result = await service.update('user-1', 'board-1', 'New Title');
      expect(result.title).toBe('New Title');
    });
  });
});
