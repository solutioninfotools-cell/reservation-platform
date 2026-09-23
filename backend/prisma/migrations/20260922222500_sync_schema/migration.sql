-- Synchronize fields added to the Prisma schema after the previous migration.

ALTER TABLE "SystemConfig"
  ADD COLUMN "conditionsReservation" TEXT,
  ADD COLUMN "heroImageUrl" TEXT,
  ADD COLUMN "localisationUrl" TEXT,
  ADD COLUMN "delaiMinAnnulationHeures" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "delaiMinModificationHeures" INTEGER NOT NULL DEFAULT 48,
  ADD COLUMN "maxChangementsRdv" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Client"
  ADD COLUMN "adresse" TEXT;

CREATE TYPE "StatutService" AS ENUM ('DISPONIBLE', 'COMPLET', 'INDISPONIBLE');

ALTER TABLE "Service"
  ADD COLUMN "statut" "StatutService" NOT NULL DEFAULT 'DISPONIBLE';

ALTER TABLE "RendezVous"
  ADD COLUMN "nombreChangements" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "changeUsed" BOOLEAN NOT NULL DEFAULT false;
