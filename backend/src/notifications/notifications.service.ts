import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: TypeNotification, message: string) {
    return this.prisma.notification.create({ data: { userId, type, message } });
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({ where: { userId, lu: false }, data: { lu: true } });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, lu: false } });
  }
}
