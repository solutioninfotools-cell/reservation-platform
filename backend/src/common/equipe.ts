import { PrismaService } from '../prisma/prisma.service';

/**
 * Taille de l'équipe de l'établissement.
 *
 * `SystemConfig.tailleEquipe` fixe le nombre total de personnes (Professionnels +
 * Réceptionnistes). NULL = pas de limite. Les comptes ACTIF et EN_ATTENTE occupent
 * une place (sinon des inscriptions en attente dépasseraient le quota une fois
 * validées) ; les comptes REFUSE / DESACTIVE n'en occupent pas. L'Admin n'est pas compté.
 */
const STATUTS_QUI_OCCUPENT_UNE_PLACE: ('ACTIF' | 'EN_ATTENTE')[] = ['ACTIF', 'EN_ATTENTE'];

export async function getEquipe(prisma: PrismaService) {
  const config = await prisma.systemConfig.findFirst();
  const taille = config?.tailleEquipe ?? null;
  const membres = await prisma.user.count({
    where: {
      role: { in: ['PROFESSIONNEL', 'RECEPTIONNISTE'] },
      statutCompte: { in: STATUTS_QUI_OCCUPENT_UNE_PLACE },
    },
  });
  return { taille, membres, complete: taille !== null && membres >= taille };
}

export function messageEquipeComplete(taille: number) {
  return `L'établissement est complet (${taille} personne${taille > 1 ? 's' : ''} au maximum). L'administrateur doit augmenter la taille de l'équipe pour autoriser de nouveaux comptes.`;
}