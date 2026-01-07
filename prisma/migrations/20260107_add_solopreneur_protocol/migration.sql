-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" REAL,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceAdjustment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverClient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverClient_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "loadRequestId" TEXT,
    "invoiceId" TEXT,
    "amount" REAL NOT NULL,
    "paymentDate" DATETIME NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentReference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverPayment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverPayment_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DriverPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LoadRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicTrackingCode" TEXT NOT NULL UNIQUE,
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
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "directDriveRequired" BOOLEAN NOT NULL DEFAULT false,
    "accessNotes" TEXT,
    "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL',
    "driverInstructions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "driverId" TEXT,
    "vehicleId" TEXT,
    "assignedAt" DATETIME,
    "acceptedByDriverAt" DATETIME,
    "gpsTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gpsTrackingStartedAt" DATETIME,
    "driverDenialReason" TEXT,
    "driverDenialNotes" TEXT,
    "driverDeniedAt" DATETIME,
    "lastDeniedByDriverId" TEXT,
    "chainOfCustodyRequired" BOOLEAN NOT NULL DEFAULT false,
    "signatureRequiredAtPickup" BOOLEAN NOT NULL DEFAULT true,
    "signatureRequiredAtDelivery" BOOLEAN NOT NULL DEFAULT true,
    "electronicPodAcceptable" BOOLEAN NOT NULL DEFAULT true,
    "temperatureLoggingRequired" BOOLEAN NOT NULL DEFAULT false,
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
    "quoteExpiresAt" DATETIME,
    "quoteAcceptedAt" DATETIME,
    "poNumber" TEXT,
    "priorityLevel" TEXT NOT NULL DEFAULT 'NORMAL',
    "tags" TEXT,
    "driverQuoteAmount" REAL,
    "driverQuoteNotes" TEXT,
    "driverQuoteSubmittedAt" DATETIME,
    "driverQuoteExpiresAt" DATETIME,
    "shipperQuoteDecision" TEXT,
    "shipperQuoteDecisionAt" DATETIME,
    "invoiceId" TEXT,
    "invoicedAt" DATETIME,
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledById" TEXT,
    "cancelledAt" DATETIME,
    "cancellationBillingRule" TEXT,
    "rawEmailContent" TEXT,
    "emailSubject" TEXT,
    "emailFrom" TEXT,
    "autoCalculatedDistance" REAL,
    "autoCalculatedTime" INTEGER,
    "suggestedRateMin" REAL,
    "suggestedRateMax" REAL,
    "deadheadStartingLocation" TEXT,
    "deadheadDistance" REAL,
    "totalDistance" REAL,
    "ratePerMile" REAL,
    "createdVia" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "shipperPaymentStatus" TEXT,
    "shipperPaidAt" DATETIME,
    "shipperPaymentMethod" TEXT,
    "createdByDriverId" TEXT,
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_createdByDriverId_fkey" FOREIGN KEY ("createdByDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoadRequest" ("id", "publicTrackingCode", "shipperId", "pickupFacilityId", "dropoffFacilityId", "serviceType", "commodityDescription", "specimenCategory", "temperatureRequirement", "estimatedContainers", "estimatedWeightKg", "declaredValue", "readyTime", "deliveryDeadline", "isRecurring", "directDriveRequired", "accessNotes", "preferredContactMethod", "driverInstructions", "status", "driverId", "vehicleId", "assignedAt", "acceptedByDriverAt", "gpsTrackingEnabled", "gpsTrackingStartedAt", "driverDenialReason", "driverDenialNotes", "driverDeniedAt", "lastDeniedByDriverId", "chainOfCustodyRequired", "signatureRequiredAtPickup", "signatureRequiredAtDelivery", "electronicPodAcceptable", "temperatureLoggingRequired", "pickupSignature", "pickupSignerName", "pickupSignatureDriverId", "deliverySignature", "deliverySignerName", "deliverySignatureDriverId", "pickupAttested", "pickupAttestedAt", "deliveryAttested", "deliveryAttestedAt", "signatureUnavailableReason", "signatureFallbackPhoto", "pickupTemperature", "pickupTempRecordedAt", "deliveryTemperature", "deliveryTempRecordedAt", "temperatureMin", "temperatureMax", "pickupTempException", "deliveryTempException", "temperatureExceptionNotes", "actualPickupTime", "actualDeliveryTime", "lateDeliveryFlag", "lateDeliveryReasonNotes", "quoteAmount", "quoteCurrency", "quoteNotes", "quoteExpiresAt", "quoteAcceptedAt", "poNumber", "priorityLevel", "tags", "driverQuoteAmount", "driverQuoteNotes", "driverQuoteSubmittedAt", "driverQuoteExpiresAt", "shipperQuoteDecision", "shipperQuoteDecisionAt", "invoiceId", "invoicedAt", "cancellationReason", "cancelledBy", "cancelledById", "cancelledAt", "cancellationBillingRule", "rawEmailContent", "emailSubject", "emailFrom", "autoCalculatedDistance", "autoCalculatedTime", "suggestedRateMin", "suggestedRateMax", "deadheadStartingLocation", "deadheadDistance", "totalDistance", "ratePerMile", "createdVia", "createdAt", "updatedAt") SELECT "id", "publicTrackingCode", "shipperId", "pickupFacilityId", "dropoffFacilityId", "serviceType", "commodityDescription", "specimenCategory", "temperatureRequirement", "estimatedContainers", "estimatedWeightKg", "declaredValue", "readyTime", "deliveryDeadline", "isRecurring", "directDriveRequired", "accessNotes", "preferredContactMethod", "driverInstructions", "status", "driverId", "vehicleId", "assignedAt", "acceptedByDriverAt", "gpsTrackingEnabled", "gpsTrackingStartedAt", "driverDenialReason", "driverDenialNotes", "driverDeniedAt", "lastDeniedByDriverId", "chainOfCustodyRequired", "signatureRequiredAtPickup", "signatureRequiredAtDelivery", "electronicPodAcceptable", "temperatureLoggingRequired", "pickupSignature", "pickupSignerName", "pickupSignatureDriverId", "deliverySignature", "deliverySignerName", "deliverySignatureDriverId", "pickupAttested", "pickupAttestedAt", "deliveryAttested", "deliveryAttestedAt", "signatureUnavailableReason", "signatureFallbackPhoto", "pickupTemperature", "pickupTempRecordedAt", "deliveryTemperature", "deliveryTempRecordedAt", "temperatureMin", "temperatureMax", "pickupTempException", "deliveryTempException", "temperatureExceptionNotes", "actualPickupTime", "actualDeliveryTime", "lateDeliveryFlag", "lateDeliveryReasonNotes", "quoteAmount", "quoteCurrency", "quoteNotes", "quoteExpiresAt", "quoteAcceptedAt", "poNumber", "priorityLevel", "tags", "driverQuoteAmount", "driverQuoteNotes", "driverQuoteSubmittedAt", "driverQuoteExpiresAt", "shipperQuoteDecision", "shipperQuoteDecisionAt", "invoiceId", "invoicedAt", "cancellationReason", "cancelledBy", "cancelledById", "cancelledAt", "cancellationBillingRule", "rawEmailContent", "emailSubject", "emailFrom", "autoCalculatedDistance", "autoCalculatedTime", "suggestedRateMin", "suggestedRateMax", "deadheadStartingLocation", "deadheadDistance", "totalDistance", "ratePerMile", "createdVia", "createdAt", "updatedAt" FROM "LoadRequest";
DROP TABLE "LoadRequest";
ALTER TABLE "new_LoadRequest" RENAME TO "LoadRequest";
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "shipperId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "createdByDriverId" TEXT,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Invoice_createdByDriverId_fkey" FOREIGN KEY ("createdByDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("id", "invoiceNumber", "shipperId", "invoiceDate", "dueDate", "subtotal", "tax", "total", "status", "sentAt", "paidAt", "paymentMethod", "paymentReference", "notes", "createdAt", "updatedAt") SELECT "id", "invoiceNumber", "shipperId", "invoiceDate", "dueDate", "subtotal", "tax", "total", "status", "sentAt", "paidAt", "paymentMethod", "paymentReference", "notes", "createdAt", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceAdjustment_invoiceId_idx" ON "InvoiceAdjustment"("invoiceId");
CREATE INDEX "InvoiceAdjustment_createdAt_idx" ON "InvoiceAdjustment"("createdAt");

-- CreateIndex
CREATE INDEX "DriverClient_driverId_idx" ON "DriverClient"("driverId");
CREATE INDEX "DriverClient_isActive_idx" ON "DriverClient"("isActive");

-- CreateIndex
CREATE INDEX "DriverPayment_driverId_idx" ON "DriverPayment"("driverId");
CREATE INDEX "DriverPayment_loadRequestId_idx" ON "DriverPayment"("loadRequestId");
CREATE INDEX "DriverPayment_invoiceId_idx" ON "DriverPayment"("invoiceId");
CREATE INDEX "DriverPayment_paymentDate_idx" ON "DriverPayment"("paymentDate");
CREATE INDEX "DriverPayment_status_idx" ON "DriverPayment"("status");

-- CreateIndex
CREATE INDEX "Invoice_createdByDriverId_idx" ON "Invoice"("createdByDriverId");

