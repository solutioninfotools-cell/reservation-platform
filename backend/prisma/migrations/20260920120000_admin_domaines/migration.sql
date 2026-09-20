-- Domaines d'activité gérés par l'Admin + types de notification correspondant
-- aux nouvelles actions de l'espace Admin.
--
-- ATTENTION : fichier restauré après suppression accidentelle. Il ne correspond
-- au schéma que si celui-ci contient le modèle `Domaine`, la colonne
-- `Professionnel.domaineId` et les trois valeurs d'énumération ci-dessous.
-- Avec un schéma qui ne les contient pas, ne pas l'appliquer : `prisma migrate
-- deploy` créerait une dérive entre la base et le schéma.

-- AlterEnum
ALTER TYPE "TypeNotification" ADD VALUE 'COMPTE_CREE';
ALTER TYPE "TypeNotification" ADD VALUE 'MOT_DE_PASSE_REINITIALISE';
ALTER TYPE "TypeNotification" ADD VALUE 'SERVICE_STATUT_MODIFIE';

-- CreateTable
CREATE TABLE "Domaine" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domaine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domaine_nom_key" ON "Domaine"("nom");

-- CreateIndex
CREATE INDEX "Domaine_actif_ordre_idx" ON "Domaine"("actif", "ordre");

-- AlterTable
ALTER TABLE "Professionnel" ADD COLUMN "domaineId" TEXT;

-- CreateIndex
CREATE INDEX "Professionnel_domaineId_idx" ON "Professionnel"("domaineId");

-- AddForeignKey
ALTER TABLE "Professionnel" ADD CONSTRAINT "Professionnel_domaineId_fkey" FOREIGN KEY ("domaineId") REFERENCES "Domaine"("id") ON DELETE SET NULL ON UPDATE CASCADE;
