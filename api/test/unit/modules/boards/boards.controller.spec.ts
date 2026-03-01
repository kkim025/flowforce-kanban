import { Test, TestingModule } from "@nestjs/testing";
import { BoardsController } from "src/modules/boards/boards.controller";
import { BoardsService } from "src/modules/boards/boards.service";
import { ColumnsService } from "src/modules/columns/columns.service";

describe("BoardsController", () => {
  let controller: BoardsController;

  beforeEach(async () => {
    const mockBoardsService = {};
    const mockColumnsService = {};
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [
        { provide: BoardsService, useValue: mockBoardsService },
        { provide: ColumnsService, useValue: mockColumnsService },
      ],
    }).compile();

    controller = module.get<BoardsController>(BoardsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
