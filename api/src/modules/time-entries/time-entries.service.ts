import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { ITimeEntriesRepository } from './domain/time-entry.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TimeEntriesService {
  constructor(
    @Inject('ITimeEntriesRepository')
    private readonly timeEntriesRepository: ITimeEntriesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async logTime(userId: string, taskId: string, minutes: number, date?: Date) {
    const entry = await this.timeEntriesRepository.create({
      taskId,
      userId,
      minutes,
      date: date || new Date(),
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
    const entries = await this.timeEntriesRepository.findByTaskId(taskId);

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
    await this.prisma.$transaction(async (tx) => {
      const entry = await tx.timeEntry.findUnique({ where: { id } });
      if (!entry) throw new NotFoundException('Time entry not found');
      if (entry.userId !== userId)
        throw new ForbiddenException('Not authorized');
      await tx.timeEntry.delete({ where: { id } });
    });
    return { success: true };
  }
}
