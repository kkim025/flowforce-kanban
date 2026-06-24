import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import { CreateWikiPageDto } from '../dto/create-wiki-page.dto';
import { WikiPageResponseDto } from '../dto/wiki-page-response.dto';
import { toWikiPageResponseDto } from '../mappers';

@Injectable()
export class CreateWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    dto: CreateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.createPage({
      boardId,
      parentId: dto.parentId ?? null,
      title: dto.title,
      content: dto.content,
      slug: dto.slug,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}
