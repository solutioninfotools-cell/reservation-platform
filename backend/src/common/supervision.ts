import { PrismaService } from '../prisma/prisma.service';

export type ModeSupervision = 'ADMIN' | 'PRESTATAIRE';

/**
 * État de supervision courant.
 *
 * Mode PRESTATAIRE : le superviseur est le professionnel désigné dans
 * `SystemConfig.superviseurUserId`. Pour les installations créées avant l'ajout de
 * cette colonne (valeur NULL), le superviseur est le tout premier professionnel
 * ACTIF — c'est le compte que la configuration initiale avait créé.
 * Si un superviseur est désigné mais que son compte n'existe plus ou n'est plus
 * actif, il n'y a PAS de repli : personne n'obtient l'accès Admin par erreur.
 */
export async function getSupervision(prisma: PrismaService) {
  const config = await prisma.systemConfig.findFirst();
  const mode = (config?.modeSupervision ?? null) as ModeSupervision | null;
  let superviseurUserId: string | null = null;

  if (mode === 'PRESTATAIRE') {
    if (config?.superviseurUserId) {
      superviseurUserId = config.superviseurUserId;
    } else {
      const premier = await prisma.user.findFirst({
        where: { role: 'PROFESSIONNEL', statutCompte: 'ACTIF' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      superviseurUserId = premier?.id ?? null;
    }
  }
  return { config, mode, superviseurUserId };
}

export async function isSupervisorPro(prisma: PrismaService, userId: string): Promise<boolean> {
  const { mode, superviseurUserId } = await getSupervision(prisma);
  return mode === 'PRESTATAIRE' && superviseurUserId === userId;
}