import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TypeNotification } from '@prisma/client';
import { getSupervision } from '../common/supervision';

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

  /**
   * Notifie ceux qui tiennent l'espace Admin : les comptes ADMIN actifs et, en mode
   * « Prestataire », le professionnel superviseur (les comptes ADMIN sont alors
   * désactivés, c'est lui qui utilise l'espace Admin). Ne doit jamais faire échouer
   * l'action métier appelante.
   */
  async notifyAdmins(
    type: TypeNotification,
    message: string,
    senderId?: string
  ) {
    try {
      const ids = new Set<string>();

      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', statutCompte: 'ACTIF' },
        select: { id: true },
      });
      admins.forEach((a) => ids.add(a.id));

      const { superviseurUserId } = await getSupervision(this.prisma);
      if (superviseurUserId) {
        const sup = await this.prisma.user.findUnique({
          where: { id: superviseurUserId },
          select: { id: true, statutCompte: true },
        });
        if (sup && sup.statutCompte === 'ACTIF') ids.add(sup.id);
      }

      if (senderId) ids.delete(senderId);
      if (!ids.size) return { count: 0 };

      return await this.prisma.notification.createMany({
        data: Array.from(ids).map((recipientId) => ({
          recipientId,
          senderId: senderId ?? null,
          type,
          message,
        })),
      });
    } catch (e) {
      console.error('❌ notifyAdmins :', e);
      return { count: 0 };
    }
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