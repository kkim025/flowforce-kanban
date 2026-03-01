import { Module, forwardRef } from "@nestjs/common";
import { ChecklistsService } from "./checklists.service";
import { ChecklistsController } from "./checklists.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { TasksModule } from "../tasks/tasks.module";
import { AddChecklistUseCase } from "../tasks/application/use-cases/add-checklist.use-case";
import { ITaskRepository } from "../tasks/domain/tasks.repository.interface";
import { IBoardRepository } from "../boards/domain/boards.repository.interface";
import { BoardsModule } from "../boards/boards.module";

@Module({
  imports: [PrismaModule, forwardRef(() => TasksModule), forwardRef(() => BoardsModule)],
  controllers: [ChecklistsController],
  providers: [
    ChecklistsService,
    {
      provide: AddChecklistUseCase,
      useFactory: (taskRepo: ITaskRepository, boardRepo: IBoardRepository) => new AddChecklistUseCase(taskRepo, boardRepo),
      inject: ["ITaskRepository", "IBoardRepository"],
    },
  ],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
