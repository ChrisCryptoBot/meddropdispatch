-- AlterTable
ALTER TABLE "TrackingEvent" ADD COLUMN "actorId" TEXT;
ALTER TABLE "TrackingEvent" ADD COLUMN "actorType" TEXT;
ALTER TABLE "TrackingEvent" ADD COLUMN "latitude" REAL;
ALTER TABLE "TrackingEvent" ADD COLUMN "longitude" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedBy" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "adminOverrideBy" TEXT,
    "adminOverrideNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("createdAt", "fileSize", "id", "loadRequestId", "mimeType", "title", "type", "uploadedBy", "url") SELECT "createdAt", "fileSize", "id", "loadRequestId", "mimeType", "title", "type", "uploadedBy", "url" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_loadRequestId_idx" ON "Document"("loadRequestId");
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
    "pickupAttested" BOOLEAN NOT NULL DEFAULT false,
    "pickupAttestedAt" DATETIME,
    "deliveryAttested" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAttestedAt" DATETIME,
    "signatureUnavailableReason" TEXT,
    "signatureFallbackPhoto" TEXT,
    "pickupTemperature" REAL,
    "deliveryTemperature" REAL,
    "temperatureMin" REAL,
    "temperatureMax" REAL,
    "pickupTempException" BOOLEAN NOT NULL DEFAULT false,
    "deliveryTempException" BOOLEAN NOT NULL DEFAULT false,
    "temperatureExceptionNotes" TEXT,
    "actualPickupTime" DATETIME,
    "actualDeliveryTime" DATETIME,
    "quoteAmount" REAL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'USD',
    "quoteNotes" TEXT,
    "quoteAcceptedAt" DATETIME,
    "invoiceId" TEXT,
    "invoicedAt" DATETIME,
    "createdVia" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoadRequest" ("acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt") SELECT "acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt" FROM "LoadRequest";
DROP TABLE "LoadRequest";
ALTER TABLE "new_LoadRequest" RENAME TO "LoadRequest";
CREATE UNIQUE INDEX "LoadRequest_publicTrackingCode_key" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_driverId_idx" ON "LoadRequest"("driverId");
CREATE INDEX "LoadRequest_publicTrackingCode_idx" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_shipperId_idx" ON "LoadRequest"("shipperId");
CREATE INDEX "LoadRequest_status_idx" ON "LoadRequest"("status");
CREATE INDEX "LoadRequest_createdAt_idx" ON "LoadRequest"("createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "TrackingEvent_actorId_idx" ON "TrackingEvent"("actorId");
