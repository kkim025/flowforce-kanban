import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { ITagRepository } from '../../domain/tag.repository.interface';

@Injectable()
export class DeleteTagUseCase {
  constructor(
    @Inject('ITagRepository')
    private readonly tagRepository: ITagRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.tagRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Tag ${id} not found`);
    }
    await this.tagRepository.delete(id);
  }
}
