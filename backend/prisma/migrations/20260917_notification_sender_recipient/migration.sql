ALTER TABLE "Notification"
RENAME COLUMN "userId" TO "recipientId";

ALTER TABLE "Notification"
ADD COLUMN "senderId" TEXT;

ALTER INDEX IF EXISTS "Notification_userId_lu_idx"
RENAME TO "Notification_recipientId_lu_idx";

ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_senderId_fkey"
FOREIGN KEY ("senderId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "Notification_senderId_idx"
ON "Notification"("senderId");