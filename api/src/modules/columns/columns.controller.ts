import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Logger, Put } from "@nestjs/common";
import { ColumnsService } from "./columns.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { GetUser } from "../../common/decorators/get-user.decorator";
import { AddColumnUseCase } from "../boards/application/use-cases/add-column.use-case";
import { ReorderColumnsUseCase } from "../boards/application/use-cases/reorder-columns.use-case";
import { AddColumnDto } from "../boards/application/dto/add-column.dto";

@Controller("columns")
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  private readonly logger = new Logger(ColumnsController.name);

  constructor(
    private readonly columnsService: ColumnsService,
    private readonly addColumnUseCase: AddColumnUseCase,
    private readonly reorderColumnsUseCase: ReorderColumnsUseCase
  ) {}

  @Post()
  async create(@GetUser("sub") userId: string, @Body() dto: AddColumnDto) {
    const column = await this.addColumnUseCase.execute(userId, dto);
    return {
      id: column.id,
      title: column.title,
      order: column.order,
      boardId: dto.boardId,
      tasks: []
    };
  }

  @Put("reorder")
  reorder(@GetUser("sub") userId: string, @Body() body: { boardId: string; columnIds: string[] }) {
    return this.reorderColumnsUseCase.execute(userId, body.boardId, body.columnIds);
  }

  @Get()
  findAll(@GetUser("sub") userId: string, @Query("boardId") boardId: string) {
    return this.columnsService.findAll(userId, boardId);
  }

  @Patch(":id")
  update(@GetUser("sub") userId: string, @Param("id") id: string, @Body() body: { title?: string; order?: number }) {
    return this.columnsService.update(userId, id, body);
  }

  @Delete(":id")
  remove(@GetUser("sub") userId: string, @Param("id") id: string) {
    return this.columnsService.remove(userId, id);
  }
}
