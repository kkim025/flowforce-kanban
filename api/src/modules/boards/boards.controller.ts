import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Logger, BadRequestException } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { ColumnsService } from '../columns/columns.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  private readonly logger = new Logger(BoardsController.name);

  constructor(
    private readonly boardsService: BoardsService,
    private readonly columnsService: ColumnsService,
  ) {}

  @Post()
  async create(@GetUser('sub') userId: string, @Body('title') title: string) {
    this.logger.log(`Creating board for user: ${userId} with title: ${title}`);
    try {
      if (!userId) {
        throw new BadRequestException('User ID is missing from request');
      }
      return await this.boardsService.create(userId, title);
    } catch (error) {
      this.logger.error(`Failed to create board for user ${userId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get()
  findAll(@GetUser('sub') userId: string) {
    return this.boardsService.findAll(userId);
  }

  @Get(':id')
  findOne(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.boardsService.findOne(userId, id);
  }

  @Patch(':id')
  update(@GetUser('sub') userId: string, @Param('id') id: string, @Body('title') title: string) {
    return this.boardsService.update(userId, id, title);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.boardsService.remove(userId, id);
  }

  @Post(':id/columns/reorder')
  reorderColumns(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body('columnIds') columnIds: string[],
  ) {
    this.logger.log(`Reordering columns for board ${id}`);
    return this.columnsService.reorder(userId, id, columnIds);
  }
}
