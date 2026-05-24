import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { TimeEntriesService } from './time-entries.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post('tasks/:taskId/time-entries')
  async logTime(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
    @Body() body: { minutes: number; date?: string },
  ) {
    return this.timeEntriesService.logTime(
      userId,
      taskId,
      body.minutes,
      body.date ? new Date(body.date) : undefined,
    );
  }

  @Get('tasks/:taskId/time-entries')
  async getTimeEntries(
    @GetUser('sub') userId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.timeEntriesService.getTimeEntriesForTask(taskId);
  }

  @Delete('time-entries/:id')
  async deleteTimeEntry(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.timeEntriesService.deleteTimeEntry(id, userId);
  }
}
