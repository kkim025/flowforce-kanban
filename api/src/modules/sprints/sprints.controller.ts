import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateSprintUseCase } from './application/use-cases/create-sprint.use-case';
import { UpdateSprintUseCase } from './application/use-cases/update-sprint.use-case';
import { DeleteSprintUseCase } from './application/use-cases/delete-sprint.use-case';
import { ActivateSprintUseCase } from './application/use-cases/activate-sprint.use-case';
import { ArchiveSprintUseCase } from './application/use-cases/archive-sprint.use-case';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSprintDto } from './application/dto/create-sprint.dto';
import { UpdateSprintDto } from './application/dto/update-sprint.dto';

@Controller('sprints')
@UseGuards(JwtAuthGuard)
export class SprintsController {
  constructor(
    private readonly createSprintUseCase: CreateSprintUseCase,
    private readonly updateSprintUseCase: UpdateSprintUseCase,
    private readonly deleteSprintUseCase: DeleteSprintUseCase,
    private readonly activateSprintUseCase: ActivateSprintUseCase,
    private readonly archiveSprintUseCase: ArchiveSprintUseCase,
    private readonly prisma: PrismaService,
  ) {}

  // GET /sprints/boards/:boardId — list active sprints for a board (any member)
  @Get('boards/:boardId')
  async findByBoard(@Param('boardId') boardId: string) {
    return this.prisma.sprint.findMany({
      where: { boardId, status: { not: 'ARCHIVED' } },
      orderBy: { startDate: 'asc' },
    });
  }

  // GET /boards/:boardId/sprints/active — get active sprint (any member)
  @Get('boards/:boardId/active')
  async findActiveByBoard(@Param('boardId') boardId: string) {
    return this.prisma.sprint.findFirst({
      where: { boardId, status: 'ACTIVE' },
    });
  }

  // GET /sprints/:id — get sprint by ID
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.prisma.sprint.findUnique({ where: { id } });
  }

  // POST /sprints — create sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() dto: CreateSprintDto & { boardId: string }) {
    const sprint = await this.createSprintUseCase.execute(dto);
    return this.prisma.sprint.findUnique({ where: { id: sprint.id } });
  }

  // PATCH /sprints/:id — update sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSprintDto) {
    await this.updateSprintUseCase.execute(id, dto);
    return this.prisma.sprint.findUnique({ where: { id } });
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
  async activate(@Param('id') id: string) {
    const sprint = await this.activateSprintUseCase.execute(id);
    return this.prisma.sprint.findUnique({ where: { id: sprint.id } });
  }

  // POST /sprints/:id/archive — archive sprint (Admin only)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @Post(':id/archive')
  async archive(@Param('id') id: string) {
    const sprint = await this.archiveSprintUseCase.execute(id);
    return this.prisma.sprint.findUnique({ where: { id: sprint.id } });
  }
}
