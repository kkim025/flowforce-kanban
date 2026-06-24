import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateWikiPageUseCase } from './application/use-cases/create-wiki-page.use-case';
import { UpdateWikiPageUseCase } from './application/use-cases/update-wiki-page.use-case';
import { MoveWikiPageUseCase } from './application/use-cases/move-wiki-page.use-case';
import {
  ArchiveWikiPageUseCase,
  RestoreWikiPageUseCase,
  HardDeleteWikiPageUseCase,
} from './application/use-cases/archive-wiki-page.use-case';
import {
  GetWikiTreeUseCase,
  GetWikiTrashUseCase,
} from './application/use-cases/get-wiki-tree.use-case';
import {
  GetWikiPageUseCase,
  ListWikiVersionsUseCase,
  RestoreWikiVersionUseCase,
} from './application/use-cases/list-wiki-versions.use-case';
import { CreateWikiPageDto } from './application/dto/create-wiki-page.dto';
import { UpdateWikiPageDto } from './application/dto/update-wiki-page.dto';
import { MoveWikiPageDto } from './application/dto/move-wiki-page.dto';

/**
 * Wiki endpoints are mounted at `boards/:boardId/wiki/...` so the
 * permission model can key off the board ACL.
 */
@Controller('boards/:boardId/wiki')
@UseGuards(JwtAuthGuard)
export class WikiController {
  private readonly logger = new Logger(WikiController.name);

  constructor(
    private readonly getTreeUseCase: GetWikiTreeUseCase,
    private readonly getTrashUseCase: GetWikiTrashUseCase,
    private readonly createPageUseCase: CreateWikiPageUseCase,
    private readonly getPageUseCase: GetWikiPageUseCase,
    private readonly updatePageUseCase: UpdateWikiPageUseCase,
    private readonly movePageUseCase: MoveWikiPageUseCase,
    private readonly archivePageUseCase: ArchiveWikiPageUseCase,
    private readonly restorePageUseCase: RestoreWikiPageUseCase,
    private readonly hardDeletePageUseCase: HardDeleteWikiPageUseCase,
    private readonly listVersionsUseCase: ListWikiVersionsUseCase,
    private readonly restoreVersionUseCase: RestoreWikiVersionUseCase,
  ) {}

  // ── Tree + Trash ────────────────────────────────────────────────────────

  @Get()
  getTree(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.getTreeUseCase.execute(userId, boardId);
  }

  @Get('trash')
  getTrash(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
  ) {
    return this.getTrashUseCase.execute(userId, boardId);
  }

  // ── Page CRUD ───────────────────────────────────────────────────────────

  @Post('pages')
  createPage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Body() dto: CreateWikiPageDto,
  ) {
    this.logger.log(`User ${userId} creating wiki page on board ${boardId}`);
    return this.createPageUseCase.execute(userId, boardId, dto);
  }

  @Get('pages/:pageId')
  getPage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.getPageUseCase.execute(userId, boardId, pageId);
  }

  @Patch('pages/:pageId')
  updatePage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
    @Body() dto: UpdateWikiPageDto,
  ) {
    this.logger.log(`User ${userId} updating wiki page ${pageId}`);
    return this.updatePageUseCase.execute(userId, boardId, pageId, dto);
  }

  @Post('pages/:pageId/move')
  movePage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
    @Body() dto: MoveWikiPageDto,
  ) {
    this.logger.log(`User ${userId} moving wiki page ${pageId}`);
    return this.movePageUseCase.execute(userId, boardId, pageId, dto);
  }

  // ── Recycle bin ─────────────────────────────────────────────────────────

  /**
   * Soft-delete. Without `?hard=true`, archives the page. With
   * `?hard=true`, permanently deletes (requires board ADMIN).
   */
  @Delete('pages/:pageId')
  deletePage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
    @Query('hard') hard?: string,
  ) {
    const isHard = hard === 'true' || hard === '1';
    if (isHard) {
      this.logger.warn(
        `User ${userId} HARD-deleting wiki page ${pageId} on board ${boardId}`,
      );
      return this.hardDeletePageUseCase
        .execute(userId, boardId, pageId)
        .then(() => ({ success: true }));
    }
    this.logger.log(`User ${userId} archiving wiki page ${pageId}`);
    return this.archivePageUseCase.execute(userId, boardId, pageId);
  }

  @Post('pages/:pageId/restore')
  restorePage(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
  ) {
    this.logger.log(`User ${userId} restoring wiki page ${pageId}`);
    return this.restorePageUseCase.execute(userId, boardId, pageId);
  }

  // ── Versions ────────────────────────────────────────────────────────────

  @Get('pages/:pageId/versions')
  listVersions(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? parseInt(limit, 10) : undefined;
    return this.listVersionsUseCase.execute(
      userId,
      boardId,
      pageId,
      Number.isFinite(parsed) ? parsed : undefined,
    );
  }

  @Post('pages/:pageId/versions/:versionId/restore')
  restoreVersion(
    @GetUser('sub') userId: string,
    @Param('boardId') boardId: string,
    @Param('pageId') pageId: string,
    @Param('versionId') versionId: string,
  ) {
    this.logger.log(
      `User ${userId} restoring version ${versionId} of wiki page ${pageId}`,
    );
    return this.restoreVersionUseCase.execute(
      userId,
      boardId,
      pageId,
      versionId,
    );
  }
}
