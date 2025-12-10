-- AlterTable
ALTER TABLE "LoadRequest" ADD COLUMN "driverQuoteAmount" REAL;
ALTER TABLE "LoadRequest" ADD COLUMN "driverQuoteExpiresAt" DATETIME;
ALTER TABLE "LoadRequest" ADD COLUMN "driverQuoteNotes" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "driverQuoteSubmittedAt" DATETIME;
ALTER TABLE "LoadRequest" ADD COLUMN "shipperQuoteDecision" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "shipperQuoteDecisionAt" DATETIME;
