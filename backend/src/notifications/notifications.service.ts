import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';

/**
 * Notifications internes (CDC II.16).
 *
 * La colonne de destination s'appelle `recipientId` en base ; `senderId`, qui
 * l'accompagne, retient l'auteur de l'action notifiée lorsqu'il y en a un —
 * une notification peut aussi venir du système (rappel, annulation en cascade),
 * auquel cas elle reste vide.
 *
 * Les méthodes gardent `userId` comme nom de paramètre : c'est bien l'identité
 * d'un utilisateur que l'appelant fournit, quel que soit le nom de la colonne.
 */
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, type: TypeNotification, message: string, auteurId?: string) {
    return this.prisma.notification.create({
      data: { recipientId: userId, senderId: auteurId ?? null, type, message },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, lu: false },
      data: { lu: true },
    });
  }

  async unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { recipientId: userId, lu: false } });
  }
}
