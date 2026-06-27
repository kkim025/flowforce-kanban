import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import { MoveWikiPageDto } from '../dto/move-wiki-page.dto';
import { WikiPageResponseDto } from '../dto/wiki-page-response.dto';
import { toWikiPageResponseDto } from '../mappers';

@Injectable()
export class MoveWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
    dto: MoveWikiPageDto,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.movePage({
      boardId,
      pageId,
      parentId: dto.parentId ?? null,
      order: dto.order,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}
