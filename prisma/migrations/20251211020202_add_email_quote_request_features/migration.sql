-- AlterTable
ALTER TABLE "LoadRequest" ADD COLUMN "autoCalculatedDistance" REAL;
ALTER TABLE "LoadRequest" ADD COLUMN "autoCalculatedTime" INTEGER;
ALTER TABLE "LoadRequest" ADD COLUMN "emailFrom" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "emailSubject" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "rawEmailContent" TEXT;
ALTER TABLE "LoadRequest" ADD COLUMN "suggestedRateMax" REAL;
ALTER TABLE "LoadRequest" ADD COLUMN "suggestedRateMin" REAL;

