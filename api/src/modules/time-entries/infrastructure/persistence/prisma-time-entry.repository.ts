import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import type {
  ITimeEntriesRepository,
  TimeEntry,
} from '../../domain/time-entry.interface';

@Injectable()
export class PrismaTimeEntryRepository implements ITimeEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    taskId: string;
    userId: string;
    minutes: number;
    date: Date;
  }): Promise<TimeEntry> {
    const entry = await this.prisma.timeEntry.create({
      data: {
        taskId: data.taskId,
        userId: data.userId,
        minutes: data.minutes,
        date: data.date,
      },
    });
    return {
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      minutes: entry.minutes,
      date: entry.date,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  async findById(id: string): Promise<TimeEntry | null> {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!entry) return null;
    return {
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      minutes: entry.minutes,
      date: entry.date,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }

  async findByTaskId(taskId: string): Promise<TimeEntry[]> {
    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId },
      orderBy: { date: 'desc' },
    });
    return entries.map((entry) => ({
      id: entry.id,
      taskId: entry.taskId,
      userId: entry.userId,
      minutes: entry.minutes,
      date: entry.date,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.timeEntry.delete({ where: { id } });
  }
}
