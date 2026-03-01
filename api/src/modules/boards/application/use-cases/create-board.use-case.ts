import { Injectable, Inject } from "@nestjs/common";
import type { IBoardRepository } from "../../domain/boards.repository.interface";
import { CreateBoardDto } from "../dto/create-board.dto";
import { Board } from "../../domain/board.entity";
import { Column } from "../../domain/column.entity";

@Injectable()
export class CreateBoardUseCase {
  constructor(
    @Inject("IBoardRepository")
    private boardRepository: IBoardRepository
  ) {}

  async execute(dto: CreateBoardDto, ownerId: string): Promise<Board> {
    const boardResult = Board.create({
      title: dto.title,
      ownerId: ownerId,
      columns: [],
    });

    if (boardResult.isFailure) {
      throw new Error(String(boardResult.error));
    }

    const board = boardResult.getValue();

    // Add default columns
    const defaultColumns = ["To Do", "In Progress", "Done"];
    defaultColumns.forEach((title, index) => {
      const columnResult = Column.create({
        title,
        order: index,
      });
      if (columnResult.isSuccess) {
        board.addColumn(columnResult.getValue());
      }
    });

    await this.boardRepository.save(board);

    // If we want columns persisted immediately
    for (const col of board.columns) {
      await this.boardRepository.saveColumn(board.id, col);
    }

    return board;
  }
}
