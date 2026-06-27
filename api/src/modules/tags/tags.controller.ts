import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { ListTagsByBoardUseCase } from './application/use-cases/list-tags-by-board.use-case';
import { CreateTagUseCase } from './application/use-cases/create-tag.use-case';
import { UpdateTagUseCase } from './application/use-cases/update-tag.use-case';
import { DeleteTagUseCase } from './application/use-cases/delete-tag.use-case';
import { CreateTagDto } from './application/dto/create-tag.dto';
import { UpdateTagDto } from './application/dto/update-tag.dto';

@Controller('tags')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class TagsController {
  constructor(
    private readonly listTagsByBoardUseCase: ListTagsByBoardUseCase,
    private readonly createTagUseCase: CreateTagUseCase,
    private readonly updateTagUseCase: UpdateTagUseCase,
    private readonly deleteTagUseCase: DeleteTagUseCase,
  ) {}

  // GET /tags?boardId=... — list the tag library for a board
  @Get()
  async listByBoard(@Query('boardId') boardId: string) {
    return this.listTagsByBoardUseCase.execute(boardId);
  }

  // POST /tags — create a tag (any authenticated member of the board; MVP
  // skips the BoardMember lookup so any logged-in user can populate a
  // board's library. Tighten later if needed.)
  @Post()
  async create(@Body() dto: CreateTagDto) {
    return this.createTagUseCase.execute(dto);
  }

  // PATCH /tags/:id — rename / recolor
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.updateTagUseCase.execute(id, dto);
  }

  // DELETE /tags/:id — drop tag + cascade TaskTag rows
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.deleteTagUseCase.execute(id);
    return { deleted: true };
  }
}
