import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PrismaTagRepository } from './infrastructure/persistence/prisma-tag.repository';
import { ListTagsByBoardUseCase } from './application/use-cases/list-tags-by-board.use-case';
import { CreateTagUseCase } from './application/use-cases/create-tag.use-case';
import { UpdateTagUseCase } from './application/use-cases/update-tag.use-case';
import { DeleteTagUseCase } from './application/use-cases/delete-tag.use-case';
import { TagsController } from './tags.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [
    ListTagsByBoardUseCase,
    CreateTagUseCase,
    UpdateTagUseCase,
    DeleteTagUseCase,
    {
      provide: 'ITagRepository',
      useClass: PrismaTagRepository,
    },
  ],
  exports: ['ITagRepository'],
})
export class TagsModule {}
