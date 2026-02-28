import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  create(@GetUser('sub') userId: string, @Body('title') title: string) {
    return this.boardsService.create(userId, title);
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
}
