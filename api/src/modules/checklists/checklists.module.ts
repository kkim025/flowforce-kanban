import { Module } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { ChecklistsController } from './checklists.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
