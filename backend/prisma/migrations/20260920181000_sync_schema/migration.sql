-- Rattrapage : la migration `init` correspondait à un état du schéma antérieur
-- aux notes clients, aux paramètres de réservation, à la logique conditionnelle
-- des champs personnalisés et au couple recipient/sender des notifications.
-- Ce fichier réaligne la base sur `schema.prisma` ; généré via
-- `prisma migrate diff`, donc rejouable sur une base neuve (Supabase) comme sur
-- une base déjà à jour d'`init` + `admin_domaines`.

-- CreateEnum
CREATE TYPE "StatutService" AS ENUM ('DISPONIBLE', 'COMPLET', 'INDISPONIBLE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeChamp" ADD VALUE 'TEXTE_LONG';
ALTER TYPE "TypeChamp" ADD VALUE 'SWITCH';
ALTER TYPE "TypeChamp" ADD VALUE 'FICHIER';

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropIndex
DROP INDEX "Notification_userId_lu_idx";

-- AlterTable
ALTER TABLE "Affectation" ADD COLUMN     "actif" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "professionnelId" TEXT;

-- AlterTable
ALTER TABLE "ChampPersonnalise" ADD COLUMN     "conditionLogique" TEXT NOT NULL DEFAULT 'ET',
ADD COLUMN     "conditions" JSONB,
ADD COLUMN     "requisSiCondition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "texteAide" TEXT,
ADD COLUMN     "valeurParDefaut" TEXT;

-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "adresse" TEXT;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "recipientId" TEXT NOT NULL,
ADD COLUMN     "senderId" TEXT;

-- AlterTable
ALTER TABLE "RendezVous" ADD COLUMN     "changeUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nombreChangements" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "statut" "StatutService" NOT NULL DEFAULT 'DISPONIBLE';

-- AlterTable
ALTER TABLE "SystemConfig" ADD COLUMN     "conditionsReservation" TEXT,
ADD COLUMN     "delaiMinAnnulationHeures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "delaiMinModificationHeures" INTEGER NOT NULL DEFAULT 48,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "localisationUrl" TEXT,
ADD COLUMN     "maxChangementsRdv" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "NoteClient" (
    "id" TEXT NOT NULL,
    "professionnelId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NoteClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParametresReservation" (
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
CREATE INDEX "NoteClient_professionnelId_clientId_idx" ON "NoteClient"("professionnelId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ParametresReservation_professionnelId_key" ON "ParametresReservation"("professionnelId");

-- CreateIndex
CREATE INDEX "AuditLog_professionnelId_createdAt_idx" ON "AuditLog"("professionnelId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_lu_idx" ON "Notification"("recipientId", "lu");

-- CreateIndex
CREATE INDEX "Notification_senderId_idx" ON "Notification"("senderId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametresReservation" ADD CONSTRAINT "ParametresReservation_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

