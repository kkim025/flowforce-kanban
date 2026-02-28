import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ColumnsService } from './columns.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('columns')
@UseGuards(JwtAuthGuard)
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @Post()
  create(
    @GetUser('sub') userId: string,
    @Body() body: { title: string; boardId: string; order: number },
  ) {
    return this.columnsService.create(userId, body);
  }

  @Get()
  findAll(@GetUser('sub') userId: string, @Query('boardId') boardId: string) {
    return this.columnsService.findAll(userId, boardId);
  }

  @Patch(':id')
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() body: { title?: string; order?: number },
  ) {
    return this.columnsService.update(userId, id, body);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.columnsService.remove(userId, id);
  }
}
