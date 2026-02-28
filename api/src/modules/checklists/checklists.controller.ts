import { Controller, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Post('tasks/:taskId/checklists')
  create(
    @GetUser('id') userId: string,
    @Param('taskId') taskId: string,
    @Body() data: { title: string },
  ) {
    return this.checklistsService.create(userId, { ...data, taskId });
  }

  @Patch('checklists/:id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() data: { title?: string },
  ) {
    return this.checklistsService.update(userId, id, data);
  }

  @Delete('checklists/:id')
  remove(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.checklistsService.remove(userId, id);
  }
}
