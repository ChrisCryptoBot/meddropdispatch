-- AlterTable
ALTER TABLE "Document" ADD COLUMN "fileSize" INTEGER;
ALTER TABLE "Document" ADD COLUMN "mimeType" TEXT;
ALTER TABLE "Document" ADD COLUMN "uploadedBy" TEXT;

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "vehicleType" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "vehiclePlate" TEXT,
    "hasRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "un3373Certified" BOOLEAN NOT NULL DEFAULT false,
    "un3373ExpiryDate" DATETIME,
    "hipaaTrainingDate" DATETIME,
    "hiredDate" DATETIME,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoadRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicTrackingCode" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "pickupFacilityId" TEXT NOT NULL,
    "dropoffFacilityId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "commodityDescription" TEXT NOT NULL,
    "specimenCategory" TEXT NOT NULL,
    "temperatureRequirement" TEXT NOT NULL,
    "estimatedContainers" INTEGER,
    "estimatedWeightKg" REAL,
    "declaredValue" REAL,
    "readyTime" DATETIME,
    "deliveryDeadline" DATETIME,
    "accessNotes" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "driverId" TEXT,
    "assignedAt" DATETIME,
    "acceptedByDriverAt" DATETIME,
    "pickupSignature" TEXT,
    "pickupSignerName" TEXT,
    "deliverySignature" TEXT,
    "deliverySignerName" TEXT,
    "pickupTemperature" REAL,
    "deliveryTemperature" REAL,
    "actualPickupTime" DATETIME,
    "actualDeliveryTime" DATETIME,
    "quoteAmount" REAL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'USD',
    "quoteNotes" TEXT,
    "quoteAcceptedAt" DATETIME,
    "createdVia" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoadRequest" ("accessNotes", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "pickupFacilityId", "preferredContactMethod", "publicTrackingCode", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt") SELECT "accessNotes", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "pickupFacilityId", "preferredContactMethod", "publicTrackingCode", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt" FROM "LoadRequest";
DROP TABLE "LoadRequest";
ALTER TABLE "new_LoadRequest" RENAME TO "LoadRequest";
CREATE UNIQUE INDEX "LoadRequest_publicTrackingCode_key" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_driverId_idx" ON "LoadRequest"("driverId");
CREATE INDEX "LoadRequest_publicTrackingCode_idx" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_shipperId_idx" ON "LoadRequest"("shipperId");
CREATE INDEX "LoadRequest_status_idx" ON "LoadRequest"("status");
CREATE INDEX "LoadRequest_createdAt_idx" ON "LoadRequest"("createdAt");
CREATE TABLE "new_Shipper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "clientType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shipper" ("clientType", "companyName", "contactName", "createdAt", "email", "id", "phone", "updatedAt") SELECT "clientType", "companyName", "contactName", "createdAt", "email", "id", "phone", "updatedAt" FROM "Shipper";
DROP TABLE "Shipper";
ALTER TABLE "new_Shipper" RENAME TO "Shipper";
CREATE UNIQUE INDEX "Shipper_email_key" ON "Shipper"("email");
CREATE INDEX "Shipper_email_idx" ON "Shipper"("email");
CREATE INDEX "Shipper_companyName_idx" ON "Shipper"("companyName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");

-- CreateIndex
CREATE INDEX "Driver_email_idx" ON "Driver"("email");

-- CreateIndex
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
