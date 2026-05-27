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
    // Build task filter - using any due to Prisma type complexity with config spread

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

  async update(userId: string, id: string, title?: string, status?: string): Promise<Board> {
    // Check ownership first
    await this.findOne(userId, id);

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (status !== undefined) data.status = status;

    return this.prisma.board.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string): Promise<Board> {
    // Check ownership first
    await this.findOne(userId, id);

    return this.prisma.board.delete({
      where: { id },
    });
  }

  async getSprintReport(userId: string, boardId: string, sprintId: string) {
    // Verify board ownership
    await this.findOne(userId, boardId);

    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { tasks: true },
    });

    if (!sprint || sprint.boardId !== boardId) {
      throw new NotFoundException('Sprint not found');
    }

    const taskIds = sprint.tasks.map((t) => t.id);
    const timeEntries = await this.prisma.timeEntry.groupBy({
      by: ['taskId'],
      where: { taskId: { in: taskIds } },
      _sum: { minutes: true },
    });

    const timeEntryMap = new Map(
      timeEntries.map((te) => [te.taskId, te._sum.minutes || 0]),
    );

    const tasks = sprint.tasks.map((task) => {
      const logged = timeEntryMap.get(task.id) || 0;
      return {
        taskId: task.id,
        content: task.content,
        estimatedMinutes: task.estimatedMinutes,
        loggedMinutes: logged,
        variance: logged - (task.estimatedMinutes || 0),
      };
    });

    const totalEstimated = tasks.reduce(
      (sum, t) => sum + (t.estimatedMinutes || 0),
      0,
    );
    const totalLogged = tasks.reduce((sum, t) => sum + t.loggedMinutes, 0);

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      startDate: sprint.startDate.toISOString(),
      endDate: sprint.endDate.toISOString(),
      totalEstimated,
      totalLogged,
      taskCount: tasks.length,
      tasks,
    };
  }
}
