import { Controller, Post, Body, Patch, Param, Delete, UseGuards, Logger } from "@nestjs/common";
import { SubtasksService } from "./subtasks.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { UpdateSubtaskUseCase } from "../tasks/application/use-cases/update-subtask.use-case";
import { UpdateSubtaskDto } from "../tasks/application/dto/update-subtask.dto";

@Controller("subtasks")
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  private readonly logger = new Logger(SubtasksController.name);

  constructor(
    private readonly subtasksService: SubtasksService,
    private readonly updateSubtaskUseCase: UpdateSubtaskUseCase
  ) {}

  @Post()
  create(@GetUser("sub") userId: string, @Body() body: { content: string; taskId?: string; checklistId?: string }) {
    return this.subtasksService.create(userId, body);
  }

  @Patch(":id")
  update(@GetUser("sub") userId: string, @Param("id") id: string, @Body() dto: UpdateSubtaskDto) {
    return this.updateSubtaskUseCase.execute(userId, id, dto);
  }

  @Delete(":id")
  remove(@GetUser("sub") userId: string, @Param("id") id: string) {
    return this.subtasksService.remove(userId, id);
  }
}
