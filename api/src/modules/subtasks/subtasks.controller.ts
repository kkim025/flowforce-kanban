import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UpdateSubtaskUseCase } from '../tasks/application/use-cases/update-subtask.use-case';
import { UpdateSubtaskDto } from '../tasks/application/dto/update-subtask.dto';

@Controller('subtasks')
@UseGuards(JwtAuthGuard)
export class SubtasksController {
  private readonly logger = new Logger(SubtasksController.name);

  constructor(
    private readonly subtasksService: SubtasksService,
    private readonly updateSubtaskUseCase: UpdateSubtaskUseCase,
  ) {}

  @Post()
  create(
    @GetUser('sub') userId: string,
    @Body() body: { content: string; checklistId: string; priority?: string },
  ) {
    return this.subtasksService.create(userId, body);
  }

  @Patch(':id')
  async update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
  ) {
    const subtask = await this.updateSubtaskUseCase.execute(userId, id, dto);
    return {
      id: subtask.id,
      content: subtask.content,
      completed: subtask.completed,
    };
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.subtasksService.remove(userId, id);
  }

  @Get()
  async findAll(
    @GetUser('sub') userId: string,
    @Query('checklistId') checklistId: string,
  ) {
    if (!checklistId)
      throw new BadRequestException('checklistId query param required');
    // Verify user has access to this checklist
    await this.subtasksService.checkChecklistOwnership(userId, checklistId);
    return this.subtasksService.findAllByChecklist(checklistId);
  }

  @Patch(':id/toggle')
  async toggle(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.subtasksService.toggle(userId, id);
  }

  @Patch('reorder')
  async reorder(
    @GetUser('sub') userId: string,
    @Body() body: { checklistId: string; orderedIds: string[] },
  ) {
    return this.subtasksService.reorder(
      userId,
      body.checklistId,
      body.orderedIds,
    );
  }
}
