import { Controller, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('subtasks')
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Post()
  create(
    @GetUser('id') userId: string,
    @Body() body: { content: string; taskId?: string; checklistId?: string },
  ) {
    return this.subtasksService.create(userId, body);
  }

  @Patch(':id')
  update(
    @GetUser('id') userId: string,
    @Param('id') id: string,
    @Body() body: { content?: string; completed?: boolean },
  ) {
    return this.subtasksService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@GetUser('id') userId: string, @Param('id') id: string) {
    return this.subtasksService.remove(userId, id);
  }
}
