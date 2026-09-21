-- Valeur d'énumération présente dans le schéma mais créée par aucune migration :
-- sans elle, la base et `schema.prisma` divergent et `prisma migrate dev`
-- signale une dérive. Annonce diffusée par l'Admin (CDC I.13).

-- AlterEnum
ALTER TYPE "TypeNotification" ADD VALUE 'ANNONCE';
