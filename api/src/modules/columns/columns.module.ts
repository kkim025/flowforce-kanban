import { Module, forwardRef } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { ColumnsController } from './columns.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AddColumnUseCase } from './application/use-cases/add-column.use-case';
import { ReorderColumnsUseCase } from './application/use-cases/reorder-columns.use-case';
import { IBoardRepository } from '../boards/domain/boards.repository.interface';
import { BoardsModule } from '../boards/boards.module';

@Module({
  imports: [PrismaModule, forwardRef(() => BoardsModule)],
  controllers: [ColumnsController],
  providers: [
    ColumnsService,
    {
      provide: AddColumnUseCase,
      useFactory: (repo: IBoardRepository) => new AddColumnUseCase(repo),
      inject: ['IBoardRepository'],
    },
    {
      provide: ReorderColumnsUseCase,
      useFactory: (repo: IBoardRepository) => new ReorderColumnsUseCase(repo),
      inject: ['IBoardRepository'],
    },
  ],
  exports: [ColumnsService, AddColumnUseCase, ReorderColumnsUseCase],
})
export class ColumnsModule {}
