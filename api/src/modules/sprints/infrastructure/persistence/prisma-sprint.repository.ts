import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { ISprintRepository } from '../../domain/sprint.repository.interface';
import { Sprint } from '../../domain/sprint.entity';
import { SprintMapper } from './sprint.mapper';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaSprintRepository implements ISprintRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Sprint | null> {
    const raw = await this.prisma.sprint.findUnique({ where: { id } });
    if (!raw) return null;
    return SprintMapper.toDomain(raw);
  }

  async findByBoardId(
    boardId: string,
    options?: { includeArchived?: boolean },
  ): Promise<Sprint[]> {
    const includeArchived = options?.includeArchived ?? true;
    const rawSprints = await this.prisma.sprint.findMany({
      where: {
        boardId,
        ...(includeArchived ? {} : { status: { not: 'ARCHIVED' } }),
      },
      orderBy: { startDate: 'asc' },
    });
    return rawSprints.map((raw) => SprintMapper.toDomain(raw));
  }

  async findActiveByBoardId(boardId: string): Promise<Sprint | null> {
    const raw = await this.prisma.sprint.findFirst({
      where: { boardId, status: 'ACTIVE' },
    });
    if (!raw) return null;
    return SprintMapper.toDomain(raw);
  }

  async save(sprint: Sprint): Promise<void> {
    const data = SprintMapper.toPersistence(sprint);
    const existing = await this.prisma.sprint.findUnique({
      where: { id: sprint.id },
    });
    if (existing) {
      await this.prisma.sprint.update({
        where: { id: sprint.id },
        data: data as Prisma.SprintUpdateInput,
      });
    } else {
      await this.prisma.sprint.create({
        data: {
          id: sprint.id,
          name: sprint.name,
          startDate: sprint.props.startDate,
          endDate: sprint.props.endDate,
          status: sprint.status,
          boardId: sprint.boardId,
          color: sprint.color || null,
        },
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.sprint.delete({ where: { id } });
  }
}
