import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { UserDto } from './application/dto/user.dto';
import { InviteUserDto } from './application/dto/invite-user.dto';
import { UpdateUserRoleDto } from './application/dto/update-user-role.dto';
import { UpsertPrefDto } from './application/dto/upsert-notification-pref.dto';
import { ListPrefsUseCase } from './application/use-cases/list-prefs.use-case';
import { UpsertPrefUseCase } from './application/use-cases/upsert-pref.use-case';
import { NotificationType } from '../notifications/domain/notification-type.value-object';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly listPrefsUseCase: ListPrefsUseCase,
    private readonly upsertPrefUseCase: UpsertPrefUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@GetUser() user: { id: string }): Promise<UserDto | null> {
    return this.usersService.findOneById(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/notification-prefs')
  async getNotificationPrefs(@GetUser('sub') userId: string) {
    return this.listPrefsUseCase.execute(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/notification-prefs/:type')
  async upsertNotificationPref(
    @GetUser('sub') userId: string,
    @Param('type') type: string,
    @Body() dto: UpsertPrefDto,
  ) {
    // Validate the path param against the enum at the boundary. Previously
    // any string (e.g. "FOOBAR") matched the route and only failed inside the
    // use case — accept a closed set of types here too.
    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      throw new BadRequestException(`Unknown notification type: ${type}`);
    }
    return this.upsertPrefUseCase.execute(
      userId,
      type as NotificationType,
      dto.inAppEnabled,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get()
  async findAll(): Promise<UserDto[]> {
    return this.usersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('invite')
  async invite(@Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.removeUser(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.usersService.updateUserRole(id, dto.role);
  }
}
