import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isSupervisorPro } from '../supervision';

/**
 * Accès à l'espace Admin : compte ADMIN actif, OU professionnel désigné superviseur
 * (mode Prestataire). L'état est relu en base à chaque requête : un ancien admin
 * désactivé, ou un professionnel qui n'est plus superviseur, perd l'accès
 * immédiatement, sans attendre l'expiration de son jeton.
 */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user } = context.switchToHttp().getRequest();
    const refus = () => new ForbiddenException("Accès refusé : l'espace Admin est réservé au superviseur de la plateforme.");
    if (!user?.userId) throw refus();

    const compte = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true, statutCompte: true },
    });
    if (!compte || compte.statutCompte !== 'ACTIF') throw refus();

    if (compte.role === 'ADMIN') return true;
    if (compte.role === 'PROFESSIONNEL' && (await isSupervisorPro(this.prisma, user.userId))) return true;
    throw refus();
  }
}