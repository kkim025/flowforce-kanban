import { Inject, Injectable } from '@nestjs/common';
import type { ITagRepository } from '../../domain/tag.repository.interface';
import type { Tag } from '../../domain/tag.entity';

@Injectable()
export class ListTagsByBoardUseCase {
  constructor(
    @Inject('ITagRepository')
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(boardId: string): Promise<Tag[]> {
    if (!boardId) {
      return [];
    }
    return this.tagRepository.findByBoardId(boardId);
  }
}
