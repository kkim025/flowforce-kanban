import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { Priority } from '@prisma/client';
import { ChecklistsService } from '../checklists/checklists.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly checklistsService: ChecklistsService,
  ) {}

  @Post()
  create(
    @GetUser('sub') userId: string,
    @Body() body: { content: string; columnId: string; order: number; priority?: Priority; description?: string },
  ) {
    return this.tasksService.create(userId, body);
  }

  @Get()
  findAll(@GetUser('sub') userId: string, @Query('columnId') columnId: string) {
    return this.tasksService.findAll(userId, columnId);
  }

  @Patch(':id')
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { content?: string; columnId?: string; order?: number; priority?: Priority; description?: string },
  ) {
    return this.tasksService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.tasksService.remove(userId, id);
  }

  @Post(':taskId/checklists')
  createChecklist(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
    @Body() data: { title: string },
  ) {
    return this.checklistsService.create(userId, { ...data, taskId });
  }
}
