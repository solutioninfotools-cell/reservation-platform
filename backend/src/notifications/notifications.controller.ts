import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';


@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {

  constructor(
    private readonly notifications: NotificationsService
  ) {}


  @Get()
  list(
    @CurrentUser() user: any
  ) {
    return this.notifications.listForUser(
      user.userId
    );
  }


  @Get('unread-count')
  unreadCount(
    @CurrentUser() user: any
  ) {
    return this.notifications.unreadCount(
      user.userId
    );
  }


  @Patch('read-all')
  markAllRead(
    @CurrentUser() user: any
  ) {
    return this.notifications.markAllRead(
      user.userId
    );
  }


  @Patch(':id/read')
  markOneRead(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    return this.notifications.markOneRead(
      user.userId,
      id
    );
  }
}