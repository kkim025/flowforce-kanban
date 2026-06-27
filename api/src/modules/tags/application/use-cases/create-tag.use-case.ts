import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { ITagRepository } from '../../domain/tag.repository.interface';
import { Tag } from '../../domain/tag.entity';
import { CreateTagDto } from '../dto/create-tag.dto';

const DEFAULT_COLOR = '#94a3b8';

@Injectable()
export class CreateTagUseCase {
  constructor(
    @Inject('ITagRepository')
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(dto: CreateTagDto): Promise<Tag> {
    const normalizedName = dto.name.trim().toLowerCase();
    const existing = await this.tagRepository.findByBoardIdAndName(
      dto.boardId,
      normalizedName,
    );
    if (existing) {
      throw new ConflictException(
        `A tag named "${normalizedName}" already exists on this board`,
      );
    }

    const result = Tag.create({
      boardId: dto.boardId,
      name: normalizedName,
      color: dto.color || DEFAULT_COLOR,
    });

    if (result.isFailure) {
      throw new BadRequestException(String(result.error));
    }

    return this.tagRepository.save(result.getValue());
  }
}
