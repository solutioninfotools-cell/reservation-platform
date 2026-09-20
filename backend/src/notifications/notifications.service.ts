import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crée une notification pour `recipientId`.
   * `senderId` est facultatif : une notification peut provenir du système
   * (rappel, annulation automatique) et n'avoir aucun auteur.
   */
  async create(recipientId: string, type: TypeNotification, message: string, senderId?: string | null) {
    return this.prisma.notification.create({
      data: { recipientId, senderId: senderId ?? undefined, type, message },
    });
  }

  async listForUser(recipientId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId },
      include: { sender: { select: { id: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(recipientId: string) {
    return this.prisma.notification.updateMany({ where: { recipientId, lu: false }, data: { lu: true } });
  }

  async unreadCount(recipientId: string) {
    return this.prisma.notification.count({ where: { recipientId, lu: false } });
  }
}
