import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from 'src/modules/tasks/tasks.service';
import { PrismaService } from 'src/common/prisma/prisma.service';

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    const mockPrisma = {
      task: {
        findUnique: jest.fn(),
        create: jest.fn(),
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
