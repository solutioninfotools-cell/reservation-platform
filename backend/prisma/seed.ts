import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

/**
 * Amorçage de la plateforme — équivalent en ligne de commande de l'assistant
 * de configuration initiale (`/configuration`).
 *
 * Crée UNIQUEMENT ce sans quoi personne ne peut se connecter : la configuration
 * de l'espace et le compte Admin. Aucun client, rendez-vous, service ni
 * réceptionniste n'est inventé — ces données naissent de l'usage réel de
 * l'application.
 *
 * ⚠ Les identifiants par défaut ci-dessous sont publics (ils sont dans le dépôt).
 * Ils conviennent au développement local ; en déploiement réel, fournissez
 * SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD, ou changez le mot de passe depuis
 * l'espace Admin juste après la première connexion.
 */
const ADMIN_PAR_DEFAUT = {
  email: 'admin@rendezvousapp.com',
  password: 'Admin123!',
  nom: 'Administrateur',
};

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const EMAIL = process.env.SEED_ADMIN_EMAIL ?? ADMIN_PAR_DEFAUT.email;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? ADMIN_PAR_DEFAUT.password;
const NOM = process.env.SEED_ADMIN_NOM ?? ADMIN_PAR_DEFAUT.nom;
const MODE = (process.env.SEED_MODE ?? 'ADMIN') as 'ADMIN' | 'PRESTATAIRE';
const DOMAINE = process.env.SEED_DOMAINE ?? 'Général';
const PLATFORM_NAME = process.env.SEED_PLATFORM_NAME ?? 'RendezVousApp';
// Réexécuter le seed remet le mot de passe par défaut sur un compte existant.
const RESET_PASSWORD = process.env.SEED_RESET_PASSWORD === 'true';

async function main() {
  if (MODE !== 'ADMIN' && MODE !== 'PRESTATAIRE') {
    throw new Error(`SEED_MODE invalide : « ${MODE} ». Valeurs acceptées : ADMIN, PRESTATAIRE.`);
  }

  const role = MODE === 'ADMIN' ? 'ADMIN' : 'PROFESSIONNEL';
  const passwordHash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);
  const existant = await prisma.user.findUnique({ where: { email: EMAIL } });

  if (existant && !RESET_PASSWORD) {
    // On ne réécrit pas un mot de passe en silence : le compte est peut-être
    // déjà utilisé. `SEED_RESET_PASSWORD=true` force la réinitialisation.
    console.log(`\nLe compte ${EMAIL} existe déjà (rôle ${existant.role}) — aucune modification.`);
    console.log('Pour réinitialiser son mot de passe : SEED_RESET_PASSWORD=true npm run prisma:seed\n');
    return;
  }

  const config = await prisma.systemConfig.findFirst();

  await prisma.$transaction(async (tx) => {
    if (config) {
      await tx.systemConfig.update({
        where: { id: config.id },
        data: { isConfigured: true, modeSupervision: MODE, domaine: DOMAINE, platformName: PLATFORM_NAME },
      });
    } else {
      await tx.systemConfig.create({
        data: { isConfigured: true, modeSupervision: MODE, domaine: DOMAINE, platformName: PLATFORM_NAME },
      });
    }

    if (existant) {
      // Le compte est réactivé au passage : un seed qui rend la main sur un
      // compte désactivé ne servirait à rien.
      await tx.user.update({
        where: { id: existant.id },
        data: { passwordHash, statutCompte: 'ACTIF', emailVerifie: true },
      });
      return;
    }

    // Le premier compte est actif d'emblée : aucune autorité au-dessus de lui
    // ne pourrait le valider (même règle que l'assistant de configuration).
    await tx.user.create({
      data: {
        email: EMAIL,
        passwordHash,
        role,
        statutCompte: 'ACTIF',
        emailVerifie: true,
        ...(role === 'PROFESSIONNEL' ? { professionnel: { create: { nom: NOM } } } : {}),
      },
    });
  });

  console.log(`\nPlateforme amorcée — compte ${existant ? 'réinitialisé' : 'créé'}.`);
  console.log(`  Espace       : ${PLATFORM_NAME} (domaine « ${DOMAINE} », supervision ${MODE})`);
  console.log(`  Connexion    : ${EMAIL}`);
  console.log(`  Mot de passe : ${PASSWORD}`);
  console.log(`  Destination  : ${role === 'ADMIN' ? '/admin' : '/professionnel'}\n`);
  if (PASSWORD === ADMIN_PAR_DEFAUT.password) {
    console.log('Mot de passe par défaut (connu publiquement) — changez-le avant toute mise en ligne.');
  }
  console.log('Créez ensuite vos professionnels, services et disponibilités depuis l\'application.\n');
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
