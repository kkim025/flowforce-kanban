import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';
import { BoardSharingService } from './board-sharing.service';
import { PermissionService } from './permission.service';
import { PrismaBoardSharingRepository } from './infrastructure/persistence/prisma-board-sharing.repository';
import {
  BoardSharesController,
  InviteAcceptController,
} from './board-shares.controller';
import { BoardMembersController } from './board-members.controller';
import { CreateShareUseCase } from './application/use-cases/create-share.use-case';
import { ListSharesUseCase } from './application/use-cases/list-shares.use-case';
import { UpdateShareUseCase } from './application/use-cases/update-share.use-case';
import { RevokeShareUseCase } from './application/use-cases/revoke-share.use-case';
import {
  BOARD_SHARING_REPOSITORY,
  IBoardSharingRepository,
} from './domain/board-sharing.repository.interface';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [
    BoardSharesController,
    InviteAcceptController,
    BoardMembersController,
  ],
  providers: [
    BoardSharingService,
    PermissionService,
    {
      provide: BOARD_SHARING_REPOSITORY,
      useClass: PrismaBoardSharingRepository,
    },
    CreateShareUseCase,
    ListSharesUseCase,
    UpdateShareUseCase,
    RevokeShareUseCase,
  ],
  exports: [
    BoardSharingService,
    PermissionService,
    BOARD_SHARING_REPOSITORY,
  ],
})
export class BoardSharingModule {}
