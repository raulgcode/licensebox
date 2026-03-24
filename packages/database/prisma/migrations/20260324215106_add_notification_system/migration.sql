-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "contactEmail" TEXT;

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "licenseId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "daysBeforeExpiry" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_licenseId_idx" ON "notification_logs"("licenseId");

-- CreateIndex
CREATE INDEX "notification_logs_sentAt_idx" ON "notification_logs"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_licenseId_recipientEmail_daysBeforeExpiry_key" ON "notification_logs"("licenseId", "recipientEmail", "daysBeforeExpiry");

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
