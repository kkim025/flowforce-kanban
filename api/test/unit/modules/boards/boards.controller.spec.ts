import { Test, TestingModule } from "@nestjs/testing";
import { BoardsController } from "src/modules/boards/boards.controller";
import { BoardsService } from "src/modules/boards/boards.service";
import { ColumnsService } from "src/modules/columns/columns.service";
import { CreateBoardUseCase } from "src/modules/boards/application/use-cases/create-board.use-case";

describe("BoardsController", () => {
  let controller: BoardsController;

  beforeEach(async () => {
    const mockBoardsService = {};
    const mockColumnsService = {};
    const mockCreateBoardUseCase = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [
        { provide: BoardsService, useValue: mockBoardsService },
        { provide: ColumnsService, useValue: mockColumnsService },
        { provide: CreateBoardUseCase, useValue: mockCreateBoardUseCase },
      ],
    }).compile();

    controller = module.get<BoardsController>(BoardsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
