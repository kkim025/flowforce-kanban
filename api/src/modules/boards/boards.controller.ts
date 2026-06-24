import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateBoardUseCase } from './application/use-cases/create-board.use-case';
import { CreateBoardDto } from './application/dto/create-board.dto';
import { UpdateBoardDto } from './application/dto/update-board.dto';
import { ReorderColumnsUseCase } from '../columns/application/use-cases/reorder-columns.use-case';

@Controller('boards')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class BoardsController {
  private readonly logger = new Logger(BoardsController.name);

  constructor(
    private readonly boardsService: BoardsService,
    private readonly createBoardUseCase: CreateBoardUseCase,
    private readonly reorderColumnsUseCase: ReorderColumnsUseCase,
  ) {}

  @Post()
  async create(@GetUser('sub') userId: string, @Body() dto: CreateBoardDto) {
    this.logger.log(
      `Creating board for user: ${userId} with title: ${dto.title}`,
    );
    try {
      if (!userId) {
        throw new BadRequestException('User ID is missing from request');
      }
      const board = await this.createBoardUseCase.execute(dto, userId);
      return {
        id: board.id,
        title: board.title,
        ownerId: board.ownerId,
        columns: board.columns.map((col) => ({
          id: col.id,
          title: col.title,
          order: col.order,
          tasks: [],
        })),
        columnOrder: board.columnOrder,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create board for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get()
  findAll(@GetUser('sub') userId: string) {
    return this.boardsService.findAll(userId);
  }

  @Get(':id')
  findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Query('sprintId') sprintId?: string,
  ) {
    return this.boardsService.findOne(userId, id, sprintId);
  }

  @Patch(':id')
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(userId, id, dto.title, dto.status);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.boardsService.remove(userId, id);
  }

  @Post(':id/columns/reorder')
  reorderColumns(
    @GetUser('sub') userId: string,
    @Param('id') boardId: string,
    @Body('columnIds') columnIds: string[],
  ) {
    this.logger.log(`Reordering columns for board ${boardId}`);
    return this.reorderColumnsUseCase.execute(userId, boardId, columnIds);
  }

  @Get(':id/sprint-reports')
  async getSprintReport(
    @GetUser('sub') userId: string,
    @Param('id') boardId: string,
    @Query('sprintId') sprintId: string,
  ) {
    return this.boardsService.getSprintReport(userId, boardId, sprintId);
  }
}
