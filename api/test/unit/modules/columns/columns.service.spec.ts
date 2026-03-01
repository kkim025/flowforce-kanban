import { Test, TestingModule } from "@nestjs/testing";
import { ColumnsService } from "src/modules/columns/columns.service";
import { PrismaService } from "src/common/prisma/prisma.service";

describe("ColumnsService", () => {
  let service: ColumnsService;

  beforeEach(async () => {
    const mockPrisma = {
      column: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ColumnsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<ColumnsService>(ColumnsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
