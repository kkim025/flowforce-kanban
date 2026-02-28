import { Module } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { BoardsController } from './boards.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ColumnsModule } from '../columns/columns.module';

@Module({
  imports: [PrismaModule, ColumnsModule],
  providers: [BoardsService],
  controllers: [BoardsController],
})
export class BoardsModule {}
