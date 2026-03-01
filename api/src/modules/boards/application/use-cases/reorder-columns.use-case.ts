import { Injectable, Inject, NotFoundException, ForbiddenException } from "@nestjs/common";
import type { IBoardRepository } from "../../domain/boards.repository.interface";

@Injectable()
export class ReorderColumnsUseCase {
  constructor(
    @Inject("IBoardRepository")
    private boardRepository: IBoardRepository
  ) {}

  async execute(userId: string, boardId: string, columnIds: string[]): Promise<void> {
    const board = await this.boardRepository.findById(boardId);
    if (!board) {
      throw new NotFoundException(`Board with ID ${boardId} not found`);
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenException("Access denied");
    }

    for (let i = 0; i < columnIds.length; i++) {
      const id = columnIds[i];
      const column = await this.boardRepository.findColumnById(id);
      if (column) {
        column.updateOrder(i);
        await this.boardRepository.saveColumn(boardId, column);
      }
    }
  }
}
