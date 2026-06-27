import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { CreateSprintUseCase } from './application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from './application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from './application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from './application/use-cases/activate-sprint.use-case';
import { ArchiveSprintUseCase } from './application/use-cases/archive-sprint.use-case';
import { ListSprintsByBoardUseCase } from './application/use-cases/list-sprints-by-board.use-case';
import { GetActiveSprintUseCase } from './application/use-cases/get-active-sprint.use-case';
import { GetSprintUseCase } from './application/use-cases/get-sprint.use-case';
import { CreateSprintDto } from './application/dto/create-sprint.dto';
import { UpdateSprintDto } from './application/dto/update-sprint.dto';

@Controller('sprints')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(
    private readonly createSprintUseCase: CreateSprintUseCase,
    private readonly updateSprintUseCase: UpdateSprintUseCase,
    private readonly deleteSprintUseCase: DeleteSprintUseCase,
    private readonly activateSprintUseCase: ActivateSprintUseCase,
    private readonly archiveSprintUseCase: ArchiveSprintUseCase,
    private readonly listSprintsByBoardUseCase: ListSprintsByBoardUseCase,
    private readonly getActiveSprintUseCase: GetActiveSprintUseCase,
    private readonly getSprintUseCase: GetSprintUseCase,
  ) {}

  // GET /sprints/boards/:boardId — list non-archived sprints for a board (any member)
  @Get('boards/:boardId')
  async findByBoard(@Param('boardId') boardId: string) {
    return this.listSprintsByBoardUseCase.execute(boardId);
  }

  // GET /sprints/boards/:boardId/active — get the active sprint for a board (any member)
  @Get('boards/:boardId/active')
  async findActiveByBoard(@Param('boardId') boardId: string) {
    return this.getActiveSprintUseCase.execute(boardId);
  }

  // GET /sprints/:id — get a sprint by id
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.getSprintUseCase.execute(id);
  }

  // POST /sprints — create sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateSprintDto & { boardId: string }) {
    return this.createSprintUseCase.execute(dto);
  }

  // PATCH /sprints/:id — update sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    return this.updateSprintUseCase.execute(id, dto);
  }

  // DELETE /sprints/:id — delete sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.deleteSprintUseCase.execute(id);
  }

  // POST /sprints/:id/activate — activate sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post(':id/activate')
  async activate(@Param('id') id: string, @GetUser('sub') actorId: string) {
    return this.activateSprintUseCase.execute(id, actorId);
  }

  // POST /sprints/:id/archive — archive sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post(':id/archive')
  async archive(@Param('id') id: string, @GetUser('sub') actorId: string) {
    return this.archiveSprintUseCase.execute(id, actorId);
  }
}
