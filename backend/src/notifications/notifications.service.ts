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
   * Crée une notification pour un destinataire (recipientId), avec un émetteur
   * optionnel (senderId) — ex. la réceptionniste qui a déclenché l'action.
   * Le 1er paramètre accepte soit une string (recipientId, forme rétro-compatible
   * avec les appels existants), soit un objet complet.
   */
  async create(
    recipient: string | { recipientId: string; senderId?: string | null },
    type: TypeNotification,
    message: string,
  ) {
    const recipientId = typeof recipient === 'string' ? recipient : recipient.recipientId;
    const senderId = typeof recipient === 'string' ? undefined : recipient.senderId ?? undefined;
    return this.pushNotification(recipientId, type, message, senderId);
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: {
        recipientId: userId
      },

      include: {
        sender: true
      },

      orderBy: {
        createdAt: 'desc'
      },

      take: 50
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        lu: false
      },

      data: {
        lu: true
      }
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        lu: false
      }
    });
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