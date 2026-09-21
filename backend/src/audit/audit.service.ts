import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * `professionnelId` rattache l'entrée à l'activité d'un professionnel : elle
   * alimente l'« Historique des actions » de son espace (CDC II.17) sans ouvrir
   * le journal global, réservé à l'Admin.
   */
  async log(params: {
    userId?: string | null;
    action: string;
    cible?: string;
    details?: any;
    ipAddress?: string;
    professionnelId?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        cible: params.cible,
        details: params.details,
        ipAddress: params.ipAddress,
        professionnelId: params.professionnelId ?? undefined,
      },
    });
  }

  async list(params: { action?: string; professionnelId?: string; take?: number; skip?: number }) {
    return this.prisma.auditLog.findMany({
      where: {
        action: params.action || undefined,
        professionnelId: params.professionnelId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
    });
  }
}
