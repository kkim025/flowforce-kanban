import { Module, forwardRef } from "@nestjs/common";
import { SubtasksService } from "./subtasks.service";
import { SubtasksController } from "./subtasks.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { TasksModule } from "../tasks/tasks.module";
import { UpdateSubtaskUseCase } from "../tasks/application/use-cases/update-subtask.use-case";
import { ITaskRepository } from "../tasks/domain/tasks.repository.interface";
import { IBoardRepository } from "../boards/domain/boards.repository.interface";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [PrismaModule, forwardRef(() => TasksModule), forwardRef(() => BoardsModule)],
  controllers: [SubtasksController],
  providers: [
    SubtasksService,
    {
      provide: UpdateSubtaskUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) => new UpdateSubtaskUseCase(taskRepo, boardRepo),
      inject: ["ITaskRepository", "IBoardRepository"],
    },
  ],
  exports: [SubtasksService],
})
export class SubtasksModule {}
