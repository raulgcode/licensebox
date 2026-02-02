-- AlterTable: Add secret column as nullable first
ALTER TABLE "clients" ADD COLUMN "secret" TEXT;

-- Populate existing rows with UUIDs
UPDATE "clients" SET "secret" = gen_random_uuid()::TEXT WHERE "secret" IS NULL;

-- Make the column required
ALTER TABLE "clients" ALTER COLUMN "secret" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_secret_key" ON "clients"("secret");
