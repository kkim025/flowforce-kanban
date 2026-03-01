import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ChecklistsModule } from '../checklists/checklists.module';

@Module({
  imports: [PrismaModule, ChecklistsModule],
  providers: [TasksService],
  controllers: [TasksController],
})
export class TasksModule {}
