import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { NotificationResponseDto } from './application/dto/notification-response.dto';
import { GetUnreadCountUseCase } from './application/use-cases/get-unread-count.use-case';
import { ListMyNotificationsUseCase } from './application/use-cases/list-my-notifications.use-case';
import { MarkAllAsReadUseCase } from './application/use-cases/mark-all-as-read.use-case';
import { MarkAsReadUseCase } from './application/use-cases/mark-as-read.use-case';
import { NotificationMapper } from './infrastructure/persistence/notification.mapper';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly listMineUseCase: ListMyNotificationsUseCase,
    private readonly markAsReadUseCase: MarkAsReadUseCase,
    private readonly markAllAsReadUseCase: MarkAllAsReadUseCase,
    private readonly unreadCountUseCase: GetUnreadCountUseCase,
  ) {}

  @Get()
  public async list(
    @GetUser('sub') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe)
    unreadOnly?: boolean,
  ): Promise<{ items: NotificationResponseDto[]; nextCursor: string | null }> {
    const { items, nextCursor } = await this.listMineUseCase.execute(userId, {
      limit,
      cursor,
      unreadOnly,
    });
    return {
      items: items.map((n) => NotificationMapper.toWire(n)),
      nextCursor,
    };
  }

  @Get('unread-count')
  public async unreadCount(
    @GetUser('sub') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.unreadCountUseCase.execute(userId);
    return { count };
  }

  @Patch(':id/read')
  public async markRead(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<NotificationResponseDto> {
    const updated = await this.markAsReadUseCase.execute(id, userId);
    return NotificationMapper.toWire(updated);
  }

  @Post('mark-all-read')
  public async markAll(
    @GetUser('sub') userId: string,
  ): Promise<{ updated: number }> {
    const updated = await this.markAllAsReadUseCase.execute(userId);
    return { updated };
  }
}
