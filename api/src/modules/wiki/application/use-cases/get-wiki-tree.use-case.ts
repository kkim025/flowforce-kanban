import { Injectable } from '@nestjs/common';
import { WikiService } from '../../wiki.service';
import { WikiPermissionService } from '../../permission.service';
import {
  WikiTreeNodeDto,
  WikiTrashItemDto,
} from '../dto/wiki-page-response.dto';
import { toWikiTreeDto, toWikiTrashDto } from '../mappers';

@Injectable()
export class GetWikiTreeUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(userId: string, boardId: string): Promise<WikiTreeNodeDto[]> {
    await this.permissionService.enforceViewBoard(userId, boardId);
    // Lazy-create the space on first access so empty boards still
    // show an empty tree.
    await this.wikiService.getOrCreateSpace(boardId);
    const tree = await this.wikiService.getTree(boardId);
    return tree.map(toWikiTreeDto);
  }
}

@Injectable()
export class GetWikiTrashUseCase {
  constructor(
    private readonly wikiService: WikiService,
    private readonly permissionService: WikiPermissionService,
  ) {}

  async execute(userId: string, boardId: string): Promise<WikiTrashItemDto[]> {
    await this.permissionService.enforceViewBoard(userId, boardId);
    const trash = await this.wikiService.getTrash(boardId);
    return trash.map(toWikiTrashDto);
  }
}
