-- AlterTable
ALTER TABLE "licenses" ADD COLUMN     "maxUsers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "offlineToken" TEXT;
