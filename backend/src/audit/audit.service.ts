import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: { userId?: string | null; action: string; cible?: string; details?: any; ipAddress?: string }) {
    return this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
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
}
