import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Board } from '@prisma/client';

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
      include: {
        columns: {
          include: {
            tasks: {
              include: {
                checklists: {
                  include: {
                    items: true,
                  },
                },
                subtasks: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(userId: string, id: string): Promise<Board> {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                checklists: {
                  include: {
                    items: true,
                  },
                },
                subtasks: true,
              },
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
