-- Rattrapage : la migration `init` correspondait à un état du schéma antérieur
-- aux notes clients, aux paramètres de réservation, à la logique conditionnelle
-- des champs personnalisés et au couple recipient/sender des notifications.
-- Ce fichier réaligne la base sur `schema.prisma` ; généré via
-- `prisma migrate diff`, donc rejouable sur une base neuve (Supabase) comme sur
-- une base déjà à jour d'`init` + `admin_domaines`.
--
-- Version sécurisée : chaque instruction est protégée pour ne pas échouer si
-- l'élément visé (type, colonne, contrainte, index, table...) existe déjà,
-- car plusieurs migrations créées indépendamment par l'équipe se recoupent
-- sur cette base partagée.

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "StatutService" AS ENUM ('DISPONIBLE', 'COMPLET', 'INDISPONIBLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum
ALTER TYPE "TypeChamp" ADD VALUE IF NOT EXISTS 'TEXTE_LONG';
ALTER TYPE "TypeChamp" ADD VALUE IF NOT EXISTS 'SWITCH';
ALTER TYPE "TypeChamp" ADD VALUE IF NOT EXISTS 'FICHIER';

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Notification_userId_lu_idx";

-- AlterTable
ALTER TABLE "Affectation" ADD COLUMN IF NOT EXISTS "actif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "professionnelId" TEXT;

-- AlterTable
ALTER TABLE "ChampPersonnalise" ADD COLUMN IF NOT EXISTS "conditionLogique" TEXT NOT NULL DEFAULT 'ET';
ALTER TABLE "ChampPersonnalise" ADD COLUMN IF NOT EXISTS "conditions" JSONB;
ALTER TABLE "ChampPersonnalise" ADD COLUMN IF NOT EXISTS "requisSiCondition" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ChampPersonnalise" ADD COLUMN IF NOT EXISTS "texteAide" TEXT;
ALTER TABLE "ChampPersonnalise" ADD COLUMN IF NOT EXISTS "valeurParDefaut" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "adresse" TEXT;

-- AlterTable (Notification : recipientId/senderId)
DO $$ BEGIN
    ALTER TABLE "Notification" RENAME COLUMN "userId" TO "recipientId";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Notification" ALTER COLUMN "recipientId" SET NOT NULL;
EXCEPTION
    WHEN others THEN null;
END $$;

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "senderId" TEXT;

-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN IF NOT EXISTS "changeUsed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RendezVous" ADD COLUMN IF NOT EXISTS "nombreChangements" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
DO $$ BEGIN
    ALTER TABLE "Service" ADD COLUMN "statut" "StatutService" NOT NULL DEFAULT 'DISPONIBLE';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "conditionsReservation" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "delaiMinAnnulationHeures" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "delaiMinModificationHeures" INTEGER NOT NULL DEFAULT 48;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "localisationUrl" TEXT;
ALTER TABLE "SystemConfig" ADD COLUMN IF NOT EXISTS "maxChangementsRdv" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE IF NOT EXISTS "NoteClient" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ParametresReservation" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "intervalleMinutes" INTEGER NOT NULL DEFAULT 10,
    "delaiMinHeures" INTEGER NOT NULL DEFAULT 2,
    "delaiMaxJours" INTEGER NOT NULL DEFAULT 90,
    "seuilAbsences" INTEGER NOT NULL DEFAULT 2,
    "maxRdvParClientParJour" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParametresReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "NoteClient_professionnelId_clientId_idx" ON "NoteClient"("professionnelId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ParametresReservation_professionnelId_key" ON "ParametresReservation"("professionnelId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_professionnelId_createdAt_idx" ON "AuditLog"("professionnelId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_recipientId_lu_idx" ON "Notification"("recipientId", "lu");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_senderId_idx" ON "Notification"("senderId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ParametresReservation" ADD CONSTRAINT "ParametresReservation_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;