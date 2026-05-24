import { Module, forwardRef } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { BoardsModule } from '../boards/boards.module';
import { ChecklistsModule } from '../checklists/checklists.module';
import { TimeEntriesModule } from '../time-entries/time-entries.module';
import { PrismaTaskRepository } from './infrastructure/persistence/prisma-task.repository';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { MoveTaskUseCase } from './application/use-cases/move-task.use-case';
import { UpdateSubtaskUseCase } from './application/use-cases/update-subtask.use-case';
import { AddChecklistUseCase } from './application/use-cases/add-checklist.use-case';
import { ITaskRepository } from './domain/tasks.repository.interface';
import { IBoardRepository } from '../boards/domain/boards.repository.interface';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => BoardsModule),
    forwardRef(() => ChecklistsModule),
    TimeEntriesModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    {
      provide: 'ITaskRepository',
      useClass: PrismaTaskRepository,
    },
    {
      provide: CreateTaskUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) =>
        new CreateTaskUseCase(taskRepo, boardRepo),
      inject: ['ITaskRepository', 'IBoardRepository'],
    },
    {
      provide: MoveTaskUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) =>
        new MoveTaskUseCase(taskRepo, boardRepo),
      inject: ['ITaskRepository', 'IBoardRepository'],
    },
    {
      provide: UpdateSubtaskUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) =>
        new UpdateSubtaskUseCase(taskRepo, boardRepo),
      inject: ['ITaskRepository', 'IBoardRepository'],
    },
    {
      provide: AddChecklistUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) =>
        new AddChecklistUseCase(taskRepo, boardRepo),
      inject: ['ITaskRepository', 'IBoardRepository'],
    },
  ],
  exports: [
    TasksService,
    'ITaskRepository',
    CreateTaskUseCase,
    MoveTaskUseCase,
    UpdateSubtaskUseCase,
    AddChecklistUseCase,
  ],
})
export class TasksModule {}
