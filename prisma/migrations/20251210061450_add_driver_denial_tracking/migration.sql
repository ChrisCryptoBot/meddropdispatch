-- AlterTable
ALTER TABLE "LoadRequest" ADD COLUMN "driverDenialNotes" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "driverDenialReason" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "driverDeniedAt" DATETIME;
ALTER TABLE "LoadRequest" ADD COLUMN "lastDeniedByDriverId" TEXT;
