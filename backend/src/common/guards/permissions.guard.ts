import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY, PermissionKey } from '../decorators/permissions.decorator';

/**
 * Vérifie les permissions granulaires d'une Réceptionniste pour le Professionnel
 * concerné par la requête (paramètre de route :professionnelId).
 * Séparation stricte rôle / permission / affectation (section 20 du CDC).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // Les rôles Admin et Professionnel (sur leur propre espace) ne sont pas soumis
    // aux permissions de Réceptionniste.
    if (user.role !== 'RECEPTIONNISTE') return true;

    let professionnelId = request.params.professionnelId || request.body?.professionnelId || request.query?.professionnelId;

    // Cas des routes /appointments/:id/... : le professionnelId n'est pas dans l'URL,
    // on le retrouve via le rendez-vous ciblé.
    if (!professionnelId && request.params.id) {
      const rdv = await this.prisma.rendezVous.findUnique({ where: { id: request.params.id }, select: { professionnelId: true } });
      professionnelId = rdv?.professionnelId;
    }

    if (!professionnelId) {
      throw new ForbiddenException('Professionnel cible introuvable pour vérifier les permissions.');
    }

    const receptionniste = await this.prisma.receptionniste.findUnique({ where: { userId: user.userId } });
    if (!receptionniste) throw new ForbiddenException('Compte réceptionniste introuvable.');

    const affectation = await this.prisma.affectation.findUnique({
      where: { professionnelId_receptionnisteId: { professionnelId, receptionnisteId: receptionniste.id } },
    });
    if (!affectation) {
      throw new ForbiddenException("Vous n'êtes pas affectée à ce professionnel.");
    }
    // Activation sur cet espace uniquement (CDC II.13.1) : le professionnel peut
    // suspendre l'accès à son espace sans toucher au compte, qui reste valide
    // pour les autres professionnels auxquels la réceptionniste est affectée.
    if (!affectation.actif) {
      throw new ForbiddenException('Votre accès à cet espace a été suspendu par le professionnel.');
    }

    const hasAll = required.every((perm) => (affectation as any)[perm] === true);
    if (!hasAll) {
      throw new ForbiddenException('Permission insuffisante pour cette action.');
    }
    return true;
  }
}
