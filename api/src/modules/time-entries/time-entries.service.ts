import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async logTime(userId: string, taskId: string, minutes: number, date?: Date) {
    const entry = await this.prisma.timeEntry.create({
      data: {
        taskId,
        userId,
        minutes,
        date: date || new Date(),
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      userName: user?.name,
      minutes: entry.minutes,
      date: entry.date.toISOString(),
      createdAt: entry.createdAt.toISOString(),
    };
  }

  async getTimeEntriesForTask(taskId: string) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { date: 'desc' },
    });

    const enriched = await Promise.all(
      entries.map(async (entry) => {
        const user = await this.prisma.user.findUnique({
          where: { id: entry.userId },
        });
        return {
          id: entry.id,
          taskId: entry.taskId,
          userId: entry.userId,
          userName: user?.name,
          minutes: entry.minutes,
          date: entry.date.toISOString(),
          createdAt: entry.createdAt.toISOString(),
        };
      }),
    );

    return enriched;
  }

  async deleteTimeEntry(id: string, userId: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) throw new Error('Time entry not found');
    if (entry.userId !== userId) throw new Error('Not authorized');

    await this.prisma.timeEntry.delete({ where: { id } });
    return { success: true };
  }
}
