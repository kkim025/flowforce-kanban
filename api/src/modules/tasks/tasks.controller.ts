import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Put } from "@nestjs/common";
import { TasksService } from "./tasks.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { Priority } from "@prisma/client";
import { ChecklistsService } from "../checklists/checklists.service";
import { CreateTaskUseCase } from "./application/use-cases/create-task.use-case";
import { MoveTaskUseCase } from "./application/use-cases/move-task.use-case";
import { AddChecklistUseCase } from "./application/use-cases/add-checklist.use-case";
import { CreateTaskDto } from "./application/dto/create-task.dto";
import { AddChecklistDto } from "./application/dto/add-checklist.dto";

@Controller("tasks")
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly checklistsService: ChecklistsService,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly moveTaskUseCase: MoveTaskUseCase,
    private readonly addChecklistUseCase: AddChecklistUseCase
  ) {}

  @Post()
  create(@GetUser("sub") userId: string, @Body() dto: CreateTaskDto) {
    return this.createTaskUseCase.execute(dto);
  }

  @Put(":id/move")
  move(@GetUser("sub") userId: string, @Param("id") id: string, @Body() body: { columnId: string; order: number }) {
    return this.moveTaskUseCase.execute(id, body.columnId, body.order);
  }

  @Get()
  findAll(@GetUser("sub") userId: string, @Query("columnId") columnId: string) {
    return this.tasksService.findAll(userId, columnId);
  }

  @Patch(":id")
  update(
    @GetUser("sub") userId: string,
    @Param("id") id: string,
    @Body() body: { content?: string; columnId?: string; order?: number; priority?: Priority; description?: string }
  ) {
    if (body.columnId !== undefined && body.order !== undefined) {
      return this.moveTaskUseCase.execute(id, body.columnId, body.order);
    }
    return this.tasksService.update(userId, id, body);
  }

  @Delete(":id")
  remove(@GetUser("sub") userId: string, @Param("id") id: string) {
    return this.tasksService.remove(userId, id);
  }

  @Post(":taskId/checklists")
  createChecklist(@GetUser("sub") userId: string, @Param("taskId") taskId: string, @Body() data: { title: string }) {
    return this.addChecklistUseCase.execute(userId, { ...data, taskId });
  }
}
