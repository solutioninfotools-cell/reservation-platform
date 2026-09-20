import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seed — création des données de démonstration...');

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Configuration initiale (mode Admin, domaine Médical)
  const config = await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      isConfigured: true,
      modeSupervision: 'ADMIN',
      domaine: 'Médical',
      platformName: 'RendezVousApp',
      slogan: 'Votre rendez-vous, simplifié.',
      description: 'Cabinet médical — prise de rendez-vous en ligne.',
      address: '12 rue des Frères Bouadou, Sétif',
      phone: '0555 10 20 30',
      email: 'contact@rendezvousapp.com',
      joursOuvrables: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      horairesGeneraux: '09:00 – 18:00',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@rendezvousapp.com' },
    update: {},
    create: { email: 'admin@rendezvousapp.com', passwordHash, role: 'ADMIN', statutCompte: 'ACTIF', emailVerifie: true },
  });

  const proUser = await prisma.user.upsert({
    where: { email: 'ahmed.benali@rendezvousapp.com' },
    update: {},
    create: {
      email: 'ahmed.benali@rendezvousapp.com', passwordHash, role: 'PROFESSIONNEL', statutCompte: 'ACTIF', emailVerifie: true,
      professionnel: { create: { nom: 'Dr. Ahmed Benali', specialite: 'Médecin généraliste', adresse: config.address, telephone: '0555 10 20 30' } },
    },
    include: { professionnel: true },
  });
  const pro = proUser.professionnel!;

  const recUser = await prisma.user.upsert({
    where: { email: 'imane.b@rendezvousapp.com' },
    update: {},
    create: {
      email: 'imane.b@rendezvousapp.com', passwordHash, role: 'RECEPTIONNISTE', statutCompte: 'ACTIF', emailVerifie: true,
      receptionniste: { create: { nom: 'Imane B.', telephone: '0555 90 10 20' } },
    },
    include: { receptionniste: true },
  });
  const rec = recUser.receptionniste!;

  await prisma.affectation.upsert({
    where: { professionnelId_receptionnisteId: { professionnelId: pro.id, receptionnisteId: rec.id } },
    update: {},
    create: { professionnelId: pro.id, receptionnisteId: rec.id, peutConsulterAgenda: true, peutGererRdv: true, peutGererPlanning: true, peutGererParametres: false },
  });

  const service = await prisma.service.create({
    data: { professionnelId: pro.id, nom: 'Consultation générale', description: 'Consultation médicale standard', dureeMinutes: 30, prix: 3000 },
  });
  await prisma.service.create({
    data: { professionnelId: pro.id, nom: 'Certificat médical', dureeMinutes: 15, prix: 1500 },
  });

  // Disponibilités : Lundi-Vendredi 9h-17h
  for (let jour = 0; jour <= 4; jour++) {
    await prisma.disponibilite.create({ data: { professionnelId: pro.id, jourSemaine: jour, heureDebut: '09:00', heureFin: '17:00' } });
  }

  const client = await prisma.client.upsert({
    where: { telephone: '0555123466' },
    update: {},
    create: { nom: 'Hadj', prenom: 'Yasmine', telephone: '0555123466', email: 'yasmine.hadj@mail.com' },
  });

  const demain = new Date(); demain.setDate(demain.getDate() + 1); demain.setHours(9, 0, 0, 0);
  await prisma.rendezVous.create({
    data: {
      professionnelId: pro.id, serviceId: service.id, clientId: client.id,
      dateDebut: demain, dateFin: new Date(demain.getTime() + 30 * 60000),
      statut: 'RESERVE', origine: 'EN_LIGNE', manageToken: 'demo-token-000001',
    },
  });

  console.log('Seed terminé.');
  console.log('Comptes de démonstration (mot de passe: Password123!) :');
  console.log(' - Admin           :', admin.email);
  console.log(' - Professionnel   :', proUser.email);
  console.log(' - Réceptionniste  :', recUser.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
