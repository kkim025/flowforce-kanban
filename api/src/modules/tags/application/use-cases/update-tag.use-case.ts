import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ITagRepository } from '../../domain/tag.repository.interface';
import { Tag } from '../../domain/tag.entity';
import { UpdateTagDto } from '../dto/update-tag.dto';

@Injectable()
export class UpdateTagUseCase {
  constructor(
    @Inject('ITagRepository')
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(id: string, dto: UpdateTagDto): Promise<Tag> {
    const existing = await this.tagRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Tag ${id} not found`);
    }

    const nextName =
      dto.name !== undefined ? dto.name.trim().toLowerCase() : existing.name;

    if (nextName !== existing.name) {
      const clash = await this.tagRepository.findByBoardIdAndName(
        existing.boardId,
        nextName,
      );
      if (clash && clash.id !== existing.id) {
        throw new ConflictException(
          `A tag named "${nextName}" already exists on this board`,
        );
      }
    }

    const result = Tag.create(
      {
        boardId: existing.boardId,
        name: nextName,
        color: dto.color !== undefined ? dto.color : existing.color,
      },
      existing.id,
    );

    if (result.isFailure) {
      throw new BadRequestException(String(result.error));
    }

    return this.tagRepository.save(result.getValue());
  }
}
