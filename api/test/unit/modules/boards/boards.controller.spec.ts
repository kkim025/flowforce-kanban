import { Test, TestingModule } from '@nestjs/testing';
import { BoardsController } from 'src/modules/boards/boards.controller';
import { BoardsService } from 'src/modules/boards/boards.service';
import { CreateBoardUseCase } from 'src/modules/boards/application/use-cases/create-board.use-case';
import { ReorderColumnsUseCase } from 'src/modules/columns/application/use-cases/reorder-columns.use-case';

describe('BoardsController', () => {
  let controller: BoardsController;

  beforeEach(async () => {
    const mockBoardsService = {};
    const mockCreateBoardUseCase = {};
    const mockReorderColumnsUseCase = {};

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardsController],
      providers: [
        { provide: BoardsService, useValue: mockBoardsService },
        { provide: CreateBoardUseCase, useValue: mockCreateBoardUseCase },
        { provide: ReorderColumnsUseCase, useValue: mockReorderColumnsUseCase },
      ],
    }).compile();

    controller = module.get<BoardsController>(BoardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
