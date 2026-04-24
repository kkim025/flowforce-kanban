import { Test, TestingModule } from '@nestjs/testing';
import { SubtasksService } from 'src/modules/subtasks/subtasks.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('SubtasksService', () => {
  let service: SubtasksService;

  beforeEach(async () => {
    const mockPrisma = {
      subtask: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
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
});
