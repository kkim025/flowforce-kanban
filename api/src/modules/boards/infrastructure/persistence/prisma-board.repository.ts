import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { IBoardRepository } from '../../domain/boards.repository.interface';
import { Board } from '../../domain/board.entity';
import { Column } from '../../domain/column.entity';
import { BoardMapper } from './board.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaBoardRepository implements IBoardRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Board | null> {
    const rawBoard = await this.prisma.board.findUnique({
      where: { id },
      include: { columns: true },
    });

    if (!rawBoard) return null;

    return BoardMapper.toDomain(rawBoard);
  }

  async findAllByOwnerId(ownerId: string): Promise<Board[]> {
    const rawBoards = await this.prisma.board.findMany({
      where: { ownerId },
      include: { columns: true },
    });

    return rawBoards.map((board) => BoardMapper.toDomain(board));
  }

  async save(board: Board): Promise<void> {
    const persistenceBoard = BoardMapper.toPersistence(
      board,
    ) as Prisma.BoardUncheckedCreateInput;

    await this.prisma.board.upsert({
      where: { id: board.id },
      update: persistenceBoard as Prisma.BoardUpdateInput,
      create: persistenceBoard,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.board.delete({
      where: { id },
    });
  }

  async findColumnById(id: string): Promise<Column | null> {
    const rawColumn = await this.prisma.column.findUnique({
      where: { id },
    });

    if (!rawColumn) return null;

    return BoardMapper.columnToDomain(rawColumn);
  }

  async saveColumn(boardId: string, column: Column): Promise<void> {
    const persistenceColumn = BoardMapper.columnToPersistence(
      column,
      boardId,
    ) as Prisma.ColumnUncheckedCreateInput;

    await this.prisma.column.upsert({
      where: { id: column.id },
      update: persistenceColumn as Prisma.ColumnUpdateInput,
      create: persistenceColumn,
    });
  }

  async deleteColumn(id: string): Promise<void> {
    await this.prisma.column.delete({
      where: { id },
    });
  }
}
