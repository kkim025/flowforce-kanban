import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PrismaSprintRepository } from './infrastructure/persistence/prisma-sprint.repository';
import { CreateSprintUseCase } from './application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from './application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from './application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from './application/use-cases/activate-sprint.use-case';
import { AssignTaskToSprintUseCase } from './application/use-cases/assign-task-to-sprint.use-case';
import { SprintsController } from './sprints.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SprintsController],
  providers: [
    CreateSprintUseCase,
    UpdateSprintUseCase,
    DeleteSprintUseCase,
    ActivateSprintUseCase,
    AssignTaskToSprintUseCase,
    {
      provide: 'ISprintRepository',
      useClass: PrismaSprintRepository,
    },
  ],
  exports: ['ISprintRepository'],
})
export class SprintsModule {}
