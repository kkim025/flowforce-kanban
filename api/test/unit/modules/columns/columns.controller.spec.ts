import { Test, TestingModule } from "@nestjs/testing";
import { ColumnsController } from "src/modules/columns/columns.controller";
import { ColumnsService } from "src/modules/columns/columns.service";
import { AddColumnUseCase } from "src/modules/boards/application/use-cases/add-column.use-case";
import { ReorderColumnsUseCase } from "src/modules/boards/application/use-cases/reorder-columns.use-case";

describe("ColumnsController", () => {
  let controller: ColumnsController;

  beforeEach(async () => {
    const mockColumnsService = {};
    const mockAddColumnUseCase = {};
    const mockReorderColumnsUseCase = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColumnsController],
      providers: [
        { provide: ColumnsService, useValue: mockColumnsService },
        { provide: AddColumnUseCase, useValue: mockAddColumnUseCase },
        { provide: ReorderColumnsUseCase, useValue: mockReorderColumnsUseCase },
      ],
    }).compile();

    controller = module.get<ColumnsController>(ColumnsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
