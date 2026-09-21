import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';

@Injectable()
export class NotificationsService {

  constructor(
    private prisma: PrismaService
  ) {}

  async pushNotification(
    recipientId: string,
    type: TypeNotification,
    message: string,
    senderId?: string
  ) {
    return this.prisma.notification.create({
      data: {
        recipientId,
        senderId: senderId || null,
        type,
        message
      }
    });
  }

  /**
   * Crée une notification pour un destinataire.
   * Deux formes acceptées pour rester compatible avec tous les appelants :
   * - create(recipientId, type, message, senderId?) — appel positionnel
   * - create({ recipientId, senderId }, type, message) — appel par objet
   */
  async create(
    recipient: string | { recipientId: string; senderId?: string | null },
    type: TypeNotification,
    message: string,
    senderId?: string | null,
  ) {
    const recipientId = typeof recipient === 'string' ? recipient : recipient.recipientId;
    const finalSenderId =
      typeof recipient === 'string'
        ? senderId ?? undefined
        : recipient.senderId ?? senderId ?? undefined;
    return this.pushNotification(recipientId, type, message, finalSenderId ?? undefined);
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
    return this.prisma.notification.updateMany({
      where: { recipientId, lu: false },
      data: { lu: true },
    });
  }

  async unreadCount(recipientId: string) {
    return this.prisma.notification.count({ where: { recipientId, lu: false } });
  }

  async markOneRead(
    userId: string,
    notificationId: string
  ) {
    return this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: userId
      },

      data: {
        lu: true
      }
    });
  }
}