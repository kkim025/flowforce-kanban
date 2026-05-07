import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Board } from '@prisma/client';
import { BOARD_LIST_CONFIG, BOARD_DETAIL_CONFIG } from './boards-query.config';

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, title: string): Promise<Board> {
    return this.prisma.board.create({
      data: {
        title,
        ownerId: userId,
      },
      include: {
        columns: true,
      },
    });
  }

  async findAll(userId: string): Promise<Board[]> {
    return this.prisma.board.findMany({
      where: { ownerId: userId },
      include: BOARD_LIST_CONFIG,
    });
  }

  async findOne(userId: string, id: string, sprintId?: string): Promise<Board> {
    // Build task filter
    const taskWhere: any = { archived: false };
    if (sprintId) {
      taskWhere.sprintId = sprintId;
    }

    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        ...BOARD_DETAIL_CONFIG,
        columns: {
          ...BOARD_DETAIL_CONFIG.columns,
          include: {
            tasks: {
              ...BOARD_DETAIL_CONFIG.columns.include.tasks,
              where: taskWhere,
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException(`Board with ID ${id} not found`);
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return board;
  }

  async update(userId: string, id: string, title: string): Promise<Board> {
    // Check ownership first
    await this.findOne(userId, id);

    return this.prisma.board.update({
      where: { id },
      data: { title },
    });
  }

  async remove(userId: string, id: string): Promise<Board> {
    // Check ownership first
    await this.findOne(userId, id);

    return this.prisma.board.delete({
      where: { id },
    });
  }
}
