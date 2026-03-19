import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from 'src/modules/boards/boards.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: any;

  const mockUser = { id: 'user-1', email: 'test@example.com' };
  const mockBoard = { id: 'board-1', title: 'Test Board', ownerId: 'user-1' };

  beforeEach(async () => {
    const mockPrisma = {
      board: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all boards for a user', async () => {
      prisma.board.findMany.mockResolvedValue([mockBoard]);
      const result = await service.findAll(mockUser.id);
      expect(result).toEqual([mockBoard]);
      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockUser.id },
        include: {
          columns: {
            include: {
              tasks: {
                where: { archived: false },
                include: {
                  checklists: {
                    include: {
                      items: true,
                    },
                  },
                  subtasks: true,
                  activities: true,
                  comments: true,
                },
              },
            },
          },
        },
      });
    });
  });
});
