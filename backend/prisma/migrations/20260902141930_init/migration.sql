-- CreateEnum
CREATE TYPE "ModeSupervision" AS ENUM ('ADMIN', 'PRESTATAIRE');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PROFESSIONNEL', 'RECEPTIONNISTE');

-- CreateEnum
CREATE TYPE "StatutCompte" AS ENUM ('EN_ATTENTE', 'ACTIF', 'REFUSE', 'DESACTIVE');

-- CreateEnum
CREATE TYPE "TypeChamp" AS ENUM ('TEXTE', 'NOMBRE', 'SELECTION', 'RADIO', 'CHECKBOX', 'DATE');

-- CreateEnum
CREATE TYPE "TypeIndisponibilite" AS ENUM ('CRENEAU', 'JOURNEE', 'PERIODE');

-- CreateEnum
CREATE TYPE "StatutRdv" AS ENUM ('RESERVE', 'CLIENT_ARRIVE', 'EN_COURS', 'TERMINE', 'ABSENT', 'ANNULE');

-- CreateEnum
CREATE TYPE "OrigineRdv" AS ENUM ('EN_LIGNE', 'RECEPTIONNISTE', 'PROFESSIONNEL');

-- CreateEnum
CREATE TYPE "TypeNotification" AS ENUM ('NOUVELLE_RESERVATION', 'ANNULATION', 'MODIFICATION', 'CHANGEMENT_STATUT', 'PROFESSIONNEL_ABSENT', 'RAPPEL', 'CONFLIT_PLANNING', 'COMPTE_VALIDE', 'COMPTE_REFUSE', 'AFFECTATION', 'AUTORISATIONS_MODIFIEES');

-- CreateEnum
CREATE TYPE "TypeToken" AS ENUM ('VERIFICATION_EMAIL', 'RESET_PASSWORD');

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "modeSupervision" "ModeSupervision",
    "domaine" TEXT,
    "platformName" TEXT NOT NULL DEFAULT 'RendezVousApp',
    "slogan" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "joursOuvrables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "horairesGeneraux" TEXT,
    "conditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "statutCompte" "StatutCompte" NOT NULL DEFAULT 'EN_ATTENTE',
    "emailVerifie" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Professionnel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "specialite" TEXT,
    "description" TEXT,
    "adresse" TEXT,
    "telephone" TEXT,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Professionnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receptionniste" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Receptionniste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Affectation" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "receptionnisteId" TEXT NOT NULL,
    "peutConsulterAgenda" BOOLEAN NOT NULL DEFAULT true,
    "peutGererRdv" BOOLEAN NOT NULL DEFAULT true,
    "peutGererPlanning" BOOLEAN NOT NULL DEFAULT false,
    "peutGererParametres" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Affectation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "dureeMinutes" INTEGER NOT NULL,
    "prix" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChampPersonnalise" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "serviceId" TEXT,
    "label" TEXT NOT NULL,
    "type" "TypeChamp" NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "obligatoire" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChampPersonnalise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReponseChamp" (
    "id" TEXT NOT NULL,
    "champId" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,

    CONSTRAINT "ReponseChamp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disponibilite" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "jourSemaine" INTEGER NOT NULL,
    "heureDebut" TEXT NOT NULL,
    "heureFin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indisponibilite" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "type" "TypeIndisponibilite" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "clientsNotifies" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Indisponibilite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RendezVous" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "statut" "StatutRdv" NOT NULL DEFAULT 'RESERVE',
    "origine" "OrigineRdv" NOT NULL DEFAULT 'EN_LIGNE',
    "remarque" TEXT,
    "motifAnnulation" TEXT,
    "manageToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RendezVous_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoriqueStatut" (
    "id" TEXT NOT NULL,
    "rendezVousId" TEXT NOT NULL,
    "ancienStatut" "StatutRdv",
    "nouveauStatut" "StatutRdv" NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoriqueStatut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TypeNotification" NOT NULL,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypeToken" NOT NULL DEFAULT 'VERIFICATION_EMAIL',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_statutCompte_idx" ON "User"("statutCompte");

-- CreateIndex
CREATE UNIQUE INDEX "Professionnel_userId_key" ON "Professionnel"("userId");

-- CreateIndex
CREATE INDEX "Professionnel_nom_idx" ON "Professionnel"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Receptionniste_userId_key" ON "Receptionniste"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Affectation_professionnelId_receptionnisteId_key" ON "Affectation"("professionnelId", "receptionnisteId");

-- CreateIndex
CREATE INDEX "Client_nom_prenom_idx" ON "Client"("nom", "prenom");

-- CreateIndex
CREATE UNIQUE INDEX "Client_telephone_key" ON "Client"("telephone");

-- CreateIndex
CREATE INDEX "Service_professionnelId_idx" ON "Service"("professionnelId");

-- CreateIndex
CREATE INDEX "Disponibilite_professionnelId_jourSemaine_idx" ON "Disponibilite"("professionnelId", "jourSemaine");

-- CreateIndex
CREATE INDEX "Indisponibilite_professionnelId_dateDebut_dateFin_idx" ON "Indisponibilite"("professionnelId", "dateDebut", "dateFin");

-- CreateIndex
CREATE UNIQUE INDEX "RendezVous_manageToken_key" ON "RendezVous"("manageToken");

-- CreateIndex
CREATE INDEX "RendezVous_professionnelId_dateDebut_dateFin_idx" ON "RendezVous"("professionnelId", "dateDebut", "dateFin");

-- CreateIndex
CREATE INDEX "RendezVous_clientId_idx" ON "RendezVous"("clientId");

-- CreateIndex
CREATE INDEX "RendezVous_statut_idx" ON "RendezVous"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "RendezVous_professionnelId_dateDebut_key" ON "RendezVous"("professionnelId", "dateDebut");

-- CreateIndex
CREATE INDEX "Notification_userId_lu_idx" ON "Notification"("userId", "lu");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_type_idx" ON "EmailVerificationToken"("userId", "type");

-- AddForeignKey
ALTER TABLE "Professionnel" ADD CONSTRAINT "Professionnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receptionniste" ADD CONSTRAINT "Receptionniste_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Affectation" ADD CONSTRAINT "Affectation_receptionnisteId_fkey" FOREIGN KEY ("receptionnisteId") REFERENCES "Receptionniste"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampPersonnalise" ADD CONSTRAINT "ChampPersonnalise_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChampPersonnalise" ADD CONSTRAINT "ChampPersonnalise_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseChamp" ADD CONSTRAINT "ReponseChamp_champId_fkey" FOREIGN KEY ("champId") REFERENCES "ChampPersonnalise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReponseChamp" ADD CONSTRAINT "ReponseChamp_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disponibilite" ADD CONSTRAINT "Disponibilite_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Indisponibilite" ADD CONSTRAINT "Indisponibilite_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RendezVous" ADD CONSTRAINT "RendezVous_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoriqueStatut" ADD CONSTRAINT "HistoriqueStatut_rendezVousId_fkey" FOREIGN KEY ("rendezVousId") REFERENCES "RendezVous"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
