import { Board as PrismaBoard, Column as PrismaColumn } from '@prisma/client';
import { Board } from '../../domain/board.entity';
import { Column } from '../../domain/column.entity';

export class BoardMapper {
  public static toDomain(
    raw: PrismaBoard & { columns?: PrismaColumn[] },
  ): Board {
    const columns = raw.columns
      ? raw.columns.map((col) => this.columnToDomain(col))
      : [];

    const boardResult = Board.create(
      {
        title: raw.title,
        ownerId: raw.ownerId,
        columns: columns,
      },
      raw.id,
    );

    if (boardResult.isFailure) {
      throw new Error(`Board mapping error: ${boardResult.error}`);
    }

    return boardResult.getValue();
  }

  public static columnToDomain(raw: PrismaColumn): Column {
    const columnResult = Column.create(
      {
        title: raw.title,
        order: raw.order,
        boardId: raw.boardId,
      },
      raw.id,
    );

    if (columnResult.isFailure) {
      throw new Error(`Column mapping error: ${columnResult.error}`);
    }

    return columnResult.getValue();
  }

  public static toPersistence(board: Board): Partial<PrismaBoard> {
    return {
      id: board.id,
      title: board.title,
      ownerId: board.ownerId,
    };
  }

  public static columnToPersistence(
    column: Column,
    boardId: string,
  ): Partial<PrismaColumn> {
    return {
      id: column.id,
      title: column.title,
      order: column.order,
      boardId: boardId,
    };
  }
}
