import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BoardSharingModule } from '../board-sharing/board-sharing.module';
import { WikiController } from './wiki.controller';
import { WikiService } from './wiki.service';
import { WikiPermissionService } from './permission.service';
import { PrismaWikiRepository } from './infrastructure/persistence/prisma-wiki.repository';
import { WIKI_REPOSITORY } from './domain/wiki.repository.interface';
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

@Module({
  imports: [PrismaModule, BoardSharingModule],
  controllers: [WikiController],
  providers: [
    WikiService,
    WikiPermissionService,
    {
      provide: WIKI_REPOSITORY,
      useClass: PrismaWikiRepository,
    },
    CreateWikiPageUseCase,
    UpdateWikiPageUseCase,
    MoveWikiPageUseCase,
    ArchiveWikiPageUseCase,
    RestoreWikiPageUseCase,
    HardDeleteWikiPageUseCase,
    GetWikiTreeUseCase,
    GetWikiTrashUseCase,
    GetWikiPageUseCase,
    ListWikiVersionsUseCase,
    RestoreWikiVersionUseCase,
  ],
  exports: [WikiService, WikiPermissionService, WIKI_REPOSITORY],
})
export class WikiModule {}
