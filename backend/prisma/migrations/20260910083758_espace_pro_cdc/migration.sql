-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TypeChamp" ADD VALUE 'TEXTE_LONG';
ALTER TYPE "TypeChamp" ADD VALUE 'SWITCH';
ALTER TYPE "TypeChamp" ADD VALUE 'FICHIER';

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

-- AddForeignKey
ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NoteClient" ADD CONSTRAINT "NoteClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParametresReservation" ADD CONSTRAINT "ParametresReservation_professionnelId_fkey" FOREIGN KEY ("professionnelId") REFERENCES "Professionnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
