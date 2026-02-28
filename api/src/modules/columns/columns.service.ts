import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Column } from '@prisma/client';

@Injectable()
export class ColumnsService {
  constructor(private prisma: PrismaService) {}

  private async checkBoardOwnership(userId: string, boardId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });
    if (!board) throw new NotFoundException('Board not found');
    if (board.ownerId !== userId) throw new ForbiddenException('Access denied');
    return board;
  }

  async create(userId: string, data: { title: string; boardId: string; order: number }): Promise<Column> {
    await this.checkBoardOwnership(userId, data.boardId);

    return this.prisma.column.create({
      data: {
        title: data.title,
        boardId: data.boardId,
        order: data.order,
      },
    });
  }

  async findAll(userId: string, boardId: string): Promise<Column[]> {
    await this.checkBoardOwnership(userId, boardId);
    return this.prisma.column.findMany({
      where: { boardId },
      orderBy: { order: 'asc' },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async update(userId: string, id: string, data: { title?: string; order?: number }): Promise<Column> {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!column) throw new NotFoundException('Column not found');
    if (column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.column.update({
      where: { id },
      data: {
        title: data.title,
        order: data.order,
      },
    });
  }

  async remove(userId: string, id: string): Promise<Column> {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: { board: true },
    });

    if (!column) throw new NotFoundException('Column not found');
    if (column.board.ownerId !== userId) throw new ForbiddenException('Access denied');

    return this.prisma.column.delete({
      where: { id },
    });
  }
}
