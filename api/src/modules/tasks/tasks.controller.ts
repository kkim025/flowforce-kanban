import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Put,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Priority } from '@prisma/client';
import { ChecklistsService } from '../checklists/checklists.service';
import { CreateTaskUseCase } from './application/use-cases/create-task.use-case';
import { MoveTaskUseCase } from './application/use-cases/move-task.use-case';
import { CreateTaskDto } from './application/dto/create-task.dto';
import { AddChecklistUseCase } from './application/use-cases/add-checklist.use-case';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly checklistsService: ChecklistsService,
    private readonly createTaskUseCase: CreateTaskUseCase,
    private readonly moveTaskUseCase: MoveTaskUseCase,
    private readonly addChecklistUseCase: AddChecklistUseCase,
  ) {}

  @Post()
  async create(
    @GetUser('sub') userId: string,
    @Body() dto: CreateTaskDto & { id?: string },
  ) {
    // If ID is provided, use service directly to bypass use case which might not handle ID
    // Or update use case. For now, let's use service directly if ID is present for simplicity in this refactor
    if (dto.id) {
      const task = await this.tasksService.create(userId, {
        id: dto.id,
        content: dto.content,
        columnId: dto.columnId,
        order: dto.order,
        priority: dto.priority,
        description: dto.description,
        sprintId: dto.sprintId,
      });
      return {
        id: task.id,
        content: task.content,
        description: task.description,
        priority: task.priority,
        order: task.order,
        columnId: task.columnId,
        subtasks: [],
        checklists: [],
      };
    }

    const task = await this.createTaskUseCase.execute(dto);
    return {
      id: task.id,
      content: task.content,
      description: task.description,
      priority: task.priority,
      order: task.order,
      columnId: task.columnId,
      subtasks: [],
      checklists: [],
    };
  }

  @Put(':id/move')
  async move(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { columnId: string; order: number },
  ) {
    const task = await this.moveTaskUseCase.execute(
      id,
      body.columnId,
      body.order,
    );
    return {
      id: task.id,
      content: task.content,
      order: task.order,
      columnId: task.columnId,
    };
  }

  @Get()
  findAll(@GetUser('sub') userId: string, @Query('columnId') columnId: string) {
    return this.tasksService.findAll(userId, columnId);
  }

  @Patch(':id')
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body()
    body: {
      content?: string;
      columnId?: string;
      order?: number;
      priority?: Priority;
      description?: string;
      archived?: boolean;
      assigneeId?: string;
      tags?: string[];
      sprintId?: string;
    },
  ) {
    if (body.columnId !== undefined && body.order !== undefined) {
      return this.moveTaskUseCase.execute(id, body.columnId, body.order);
    }
    return this.tasksService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.tasksService.remove(userId, id);
  }

  @Post(':taskId/checklists')
  async createChecklist(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
    @Body() data: { title: string },
  ) {
    const checklist = await this.addChecklistUseCase.execute(userId, {
      ...data,
      taskId,
    });
    return {
      id: checklist.id,
      title: checklist.title,
      taskId: taskId,
      items: [],
    };
  }

  @Post(':taskId/comments')
  async addComment(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
    @Body() data: { content: string },
  ) {
    return this.tasksService.addComment(userId, taskId, data.content);
  }

  // PATCH /tasks/:taskId/sprint — assign/unassign task to sprint
  @Patch(':taskId/sprint')
  async assignSprint(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
    @Body() body: { sprintId: string | null },
  ) {
    return this.tasksService.assignSprint(userId, taskId, body.sprintId);
  }
}
