import { Controller, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ChecklistsService } from './checklists.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@Controller('checklists')
@UseGuards(JwtAuthGuard)
export class ChecklistsController {
  constructor(private readonly checklistsService: ChecklistsService) {}

  @Patch(':id')
  update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() data: { title?: string },
  ) {
    return this.checklistsService.update(userId, id, data);
  }

  @Delete(':id')
  remove(@GetUser('sub') userId: string, @Param('id') id: string) {
    return this.checklistsService.remove(userId, id);
  }
}
