import { Controller, Post, Body, Patch, Param, Delete, UseGuards, Logger } from "@nestjs/common";
import { ChecklistsService } from "./checklists.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { AddChecklistUseCase } from "../tasks/application/use-cases/add-checklist.use-case";
import { AddChecklistDto } from "../tasks/application/dto/add-checklist.dto";

@Controller("checklists")
@UseGuards(JwtAuthGuard)
export class ChecklistsController {
  private readonly logger = new Logger(ChecklistsController.name);

  constructor(
    private readonly checklistsService: ChecklistsService,
    private readonly addChecklistUseCase: AddChecklistUseCase
  ) {}

  @Post()
  async create(@GetUser("sub") userId: string, @Body() dto: AddChecklistDto) {
    const checklist = await this.addChecklistUseCase.execute(userId, dto);
    return {
      id: checklist.id,
      title: checklist.title,
      taskId: dto.taskId,
      items: []
    };
  }

  @Patch(":id")
  update(@GetUser("sub") userId: string, @Param("id") id: string, @Body() body: { title?: string }) {
    return this.checklistsService.update(userId, id, body);
  }

  @Delete(":id")
  remove(@GetUser("sub") userId: string, @Param("id") id: string) {
    return this.checklistsService.remove(userId, id);
  }
}
