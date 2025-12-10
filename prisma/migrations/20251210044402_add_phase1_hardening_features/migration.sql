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
    "pickupSignatureDriverId" TEXT,
    "deliverySignature" TEXT,
    "deliverySignerName" TEXT,
    "deliverySignatureDriverId" TEXT,
    "pickupAttested" BOOLEAN NOT NULL DEFAULT false,
    "pickupAttestedAt" DATETIME,
    "deliveryAttested" BOOLEAN NOT NULL DEFAULT false,
    "deliveryAttestedAt" DATETIME,
    "signatureUnavailableReason" TEXT,
    "signatureFallbackPhoto" TEXT,
    "pickupTemperature" REAL,
    "pickupTempRecordedAt" DATETIME,
    "deliveryTemperature" REAL,
    "deliveryTempRecordedAt" DATETIME,
    "temperatureMin" REAL,
    "temperatureMax" REAL,
    "pickupTempException" BOOLEAN NOT NULL DEFAULT false,
    "deliveryTempException" BOOLEAN NOT NULL DEFAULT false,
    "temperatureExceptionNotes" TEXT,
    "actualPickupTime" DATETIME,
    "actualDeliveryTime" DATETIME,
    "lateDeliveryFlag" BOOLEAN NOT NULL DEFAULT false,
    "lateDeliveryReasonNotes" TEXT,
    "quoteAmount" REAL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'USD',
    "quoteNotes" TEXT,
    "quoteAcceptedAt" DATETIME,
    "invoiceId" TEXT,
    "invoicedAt" DATETIME,
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" DATETIME,
    "cancellationBillingRule" TEXT,
    "createdVia" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoadRequest" ("acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryAttested", "deliveryAttestedAt", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTempException", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "pickupAttested", "pickupAttestedAt", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTempException", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "signatureFallbackPhoto", "signatureUnavailableReason", "specimenCategory", "status", "temperatureExceptionNotes", "temperatureMax", "temperatureMin", "temperatureRequirement", "updatedAt") SELECT "acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryAttested", "deliveryAttestedAt", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTempException", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "pickupAttested", "pickupAttestedAt", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTempException", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "signatureFallbackPhoto", "signatureUnavailableReason", "specimenCategory", "status", "temperatureExceptionNotes", "temperatureMax", "temperatureMin", "temperatureRequirement", "updatedAt" FROM "LoadRequest";
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
