import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import { WikiPageResponseDto } from '../dto/wiki-page-response.dto';
import { toWikiPageResponseDto } from '../mappers';

@Injectable()
export class ArchiveWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.archivePage({
      boardId,
      pageId,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}

@Injectable()
export class RestoreWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
  ): Promise<WikiPageResponseDto> {
    await this.permissionService.enforceEditBoard(userId, boardId);
    const page = await this.wikiService.restorePage({
      boardId,
      pageId,
      actorId: userId,
    });
    return toWikiPageResponseDto(page);
  }
}

@Injectable()
export class HardDeleteWikiPageUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(
    userId: string,
    boardId: string,
    pageId: string,
  ): Promise<void> {
    await this.permissionService.enforceAdminBoard(userId, boardId);
    await this.wikiService.hardDeletePage({ boardId, pageId });
  }
}
