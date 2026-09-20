import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    /** Professionnel concerné, pour alimenter son historique d'actions (CDC II.17). */
    professionnelId?: string | null;
    action: string;
    cible?: string;
    details?: any;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        professionnelId: params.professionnelId ?? undefined,
        action: params.action,
        cible: params.cible,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  }

  async list(params: { action?: string; take?: number; skip?: number }) {
    return this.prisma.auditLog.findMany({
      where: params.action ? { action: params.action } : undefined,
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 50,
      skip: params.skip ?? 0,
    });
  }

  /**
   * Historique des actions portant sur l'activité d'un professionnel
   * (CDC II.17), avec l'auteur de chaque action pour le suivi des
   * réceptionnistes (CDC II.13.3).
   */
  async listForProfessionnel(professionnelId: string, params: { action?: string; take?: number; skip?: number } = {}) {
    const rows = await this.prisma.auditLog.findMany({
      where: { professionnelId, ...(params.action ? { action: params.action } : {}) },
      orderBy: { createdAt: 'desc' },
      take: params.take ?? 100,
      skip: params.skip ?? 0,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            professionnel: { select: { nom: true } },
            receptionniste: { select: { nom: true } },
          },
        },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      cible: r.cible,
      details: r.details,
      createdAt: r.createdAt,
      auteur: r.user
        ? {
            role: r.user.role,
            nom: r.user.professionnel?.nom ?? r.user.receptionniste?.nom ?? r.user.email,
          }
        : { role: 'CLIENT', nom: 'Client' },
    }));
  }
}
