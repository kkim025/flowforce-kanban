import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../common/prisma/prisma.service';
import { ITagRepository } from '../../domain/tag.repository.interface';
import { Tag } from '../../domain/tag.entity';
import { TagMapper } from './tag.mapper';

@Injectable()
export class PrismaTagRepository implements ITagRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Tag | null> {
    const raw = await this.prisma.tag.findUnique({ where: { id } });
    if (!raw) return null;
    return TagMapper.toDomain(raw);
  }

  async findByBoardId(boardId: string): Promise<Tag[]> {
    const raw = await this.prisma.tag.findMany({
      where: { boardId },
      orderBy: { name: 'asc' },
    });
    return raw.map((row) => TagMapper.toDomain(row));
  }

  async findByBoardIdAndName(
    boardId: string,
    name: string,
  ): Promise<Tag | null> {
    const raw = await this.prisma.tag.findUnique({
      where: { boardId_name: { boardId, name } },
    });
    if (!raw) return null;
    return TagMapper.toDomain(raw);
  }

  async save(tag: Tag): Promise<Tag> {
    const data = TagMapper.toPersistence(tag);
    const saved = await this.prisma.tag.upsert({
      where: { id: tag.id },
      create: {
        id: data.id,
        boardId: data.boardId,
        name: data.name,
        color: data.color,
      },
      update: {
        name: data.name,
        color: data.color,
        boardId: data.boardId,
      },
    });
    return TagMapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    // ON DELETE CASCADE on TaskTag.tagId will remove the joins.
    await this.prisma.tag.delete({ where: { id } });
  }
}
