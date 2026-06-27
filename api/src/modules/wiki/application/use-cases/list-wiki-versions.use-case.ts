import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import { WikiPageResponseDto } from '../dto/wiki-page-response.dto';
import { WikiVersionResponseDto } from '../dto/wiki-page-response.dto';
import { toWikiPageResponseDto } from '../mappers';
import { toWikiVersionResponseDto } from '../mappers';

@Injectable()
export class GetWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceViewBoard(userId, boardId);
    const page = await this.wikiService.getPage(boardId, pageId);
    return toWikiPageResponseDto(page);
  }
}

@Injectable()
export class ListWikiVersionsUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
    limit?: number,
  ): Promise<WikiVersionResponseDto[]> {
    await this.permissionService.enforceViewBoard(userId, boardId);
    const versions = await this.wikiService.listVersions({
      boardId,
      pageId,
      limit,
    });
    return versions.map(toWikiVersionResponseDto);
  }
}

@Injectable()
export class RestoreWikiVersionUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
    versionId: string,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.restoreVersion({
      boardId,
      pageId,
      versionId,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}
