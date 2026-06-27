import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import { UpdateWikiPageDto } from '../dto/update-wiki-page.dto';
import { WikiPageResponseDto } from '../dto/wiki-page-response.dto';
import { toWikiPageResponseDto } from '../mappers';

@Injectable()
export class UpdateWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
    dto: UpdateWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.updatePage({
      boardId,
      pageId,
      title: dto.title,
      content: dto.content,
      slug: dto.slug,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}
