/*
  Warnings:

  - You are about to drop the column `accountHolderName` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `accountNumber` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `accountType` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `bankName` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `minimumPayout` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `payoutFrequency` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `routingNumber` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `taxId` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `taxIdType` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `w9Submitted` on the `Driver` table. All the data in the column will be lost.
  - You are about to drop the column `stripeInvoiceId` on the `Invoice` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BlockedEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "reason" TEXT,
    "blockedBy" TEXT,
    "blockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "LoadTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipperId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "commodityDescription" TEXT NOT NULL,
    "specimenCategory" TEXT NOT NULL,
    "temperatureRequirement" TEXT NOT NULL,
    "pickupFacilityId" TEXT NOT NULL,
    "dropoffFacilityId" TEXT NOT NULL,
    "readyTime" TEXT,
    "deliveryDeadline" TEXT,
    "accessNotes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadTemplate_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoadTemplate_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadTemplate_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "driverId" TEXT,
    "loadRequestId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" DATETIME,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "feedback" TEXT,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverRating_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverRating_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DriverRating_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GPSTrackingPoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "accuracy" REAL,
    "heading" REAL,
    "speed" REAL,
    "altitude" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GPSTrackingPoint_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GPSTrackingPoint_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleYear" INTEGER,
    "vehiclePlate" TEXT NOT NULL,
    "hasRefrigeration" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "nickname" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "expiryDate" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verifiedBy" TEXT,
    "verifiedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DriverEquipmentChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "checkedItems" TEXT NOT NULL DEFAULT '{}',
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DriverEquipmentChecklist_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CallbackQueue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipperId" TEXT NOT NULL,
    "driverId" TEXT,
    "loadRequestId" TEXT,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "calledAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallbackQueue_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CallbackQueue_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CallbackQueue_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "userType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "lockedUntil" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoadNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdByType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadNote_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationPreferences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipperId" TEXT,
    "driverId" TEXT,
    "emailNotifications" TEXT NOT NULL DEFAULT '{}',
    "inAppNotifications" TEXT NOT NULL DEFAULT '{}',
    "smsNotifications" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationPreferences_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NotificationPreferences_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadDraft" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadDraft_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "userId" TEXT,
    "userType" TEXT,
    "userEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "changes" TEXT,
    "metadata" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LoadRequestLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "locationType" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "readyTime" DATETIME,
    "accessNotes" TEXT,
    "completedAt" DATETIME,
    "completedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRequestLocation_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LoadRequestLocation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "fileHash" TEXT,
    "uploadedBy" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedAt" DATETIME,
    "adminOverride" BOOLEAN NOT NULL DEFAULT false,
    "adminOverrideBy" TEXT,
    "adminOverrideNotes" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "replacedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("adminOverride", "adminOverrideBy", "adminOverrideNotes", "createdAt", "fileHash", "fileSize", "id", "isLocked", "loadRequestId", "lockedAt", "mimeType", "title", "type", "uploadedBy", "url") SELECT "adminOverride", "adminOverrideBy", "adminOverrideNotes", "createdAt", "fileHash", "fileSize", "id", "isLocked", "loadRequestId", "lockedAt", "mimeType", "title", "type", "uploadedBy", "url" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_loadRequestId_idx" ON "Document"("loadRequestId");
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseExpiry" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
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
    "profilePicture" TEXT,
    "bio" TEXT,
    "specialties" TEXT,
    "yearsOfExperience" INTEGER,
    "languages" TEXT,
    "serviceAreas" TEXT,
    "minimumRatePerMile" REAL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "deletedReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Driver" ("createdAt", "email", "emergencyContact", "emergencyPhone", "firstName", "hasRefrigeration", "hipaaTrainingDate", "hiredDate", "id", "isAdmin", "lastName", "licenseExpiry", "licenseNumber", "minimumRatePerMile", "passwordHash", "phone", "status", "un3373Certified", "un3373ExpiryDate", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlate", "vehicleType", "vehicleYear") SELECT "createdAt", "email", "emergencyContact", "emergencyPhone", "firstName", "hasRefrigeration", "hipaaTrainingDate", "hiredDate", "id", "isAdmin", "lastName", "licenseExpiry", "licenseNumber", "minimumRatePerMile", "passwordHash", "phone", "status", "un3373Certified", "un3373ExpiryDate", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlate", "vehicleType", "vehicleYear" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");
CREATE INDEX "Driver_email_idx" ON "Driver"("email");
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
CREATE INDEX "Driver_isDeleted_idx" ON "Driver"("isDeleted");
CREATE INDEX "Driver_deletedAt_idx" ON "Driver"("deletedAt");
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "shipperId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
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
    CONSTRAINT "Invoice_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" ("createdAt", "dueDate", "id", "invoiceDate", "invoiceNumber", "notes", "paidAt", "paymentMethod", "paymentReference", "sentAt", "shipperId", "status", "subtotal", "tax", "total", "updatedAt") SELECT "createdAt", "dueDate", "id", "invoiceDate", "invoiceNumber", "notes", "paidAt", "paymentMethod", "paymentReference", "sentAt", "shipperId", "status", "subtotal", "tax", "total", "updatedAt" FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_shipperId_idx" ON "Invoice"("shipperId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");
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
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_LoadRequest" ("acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "autoCalculatedDistance", "autoCalculatedTime", "cancellationBillingRule", "cancellationReason", "cancelledAt", "cancelledBy", "cancelledById", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryAttested", "deliveryAttestedAt", "deliveryDeadline", "deliverySignature", "deliverySignatureDriverId", "deliverySignerName", "deliveryTempException", "deliveryTempRecordedAt", "deliveryTemperature", "driverDenialNotes", "driverDenialReason", "driverDeniedAt", "driverId", "driverQuoteAmount", "driverQuoteExpiresAt", "driverQuoteNotes", "driverQuoteSubmittedAt", "dropoffFacilityId", "emailFrom", "emailSubject", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "lastDeniedByDriverId", "lateDeliveryFlag", "lateDeliveryReasonNotes", "pickupAttested", "pickupAttestedAt", "pickupFacilityId", "pickupSignature", "pickupSignatureDriverId", "pickupSignerName", "pickupTempException", "pickupTempRecordedAt", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "rawEmailContent", "readyTime", "serviceType", "shipperId", "shipperQuoteDecision", "shipperQuoteDecisionAt", "signatureFallbackPhoto", "signatureUnavailableReason", "specimenCategory", "status", "suggestedRateMax", "suggestedRateMin", "temperatureExceptionNotes", "temperatureMax", "temperatureMin", "temperatureRequirement", "updatedAt") SELECT "acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "autoCalculatedDistance", "autoCalculatedTime", "cancellationBillingRule", "cancellationReason", "cancelledAt", "cancelledBy", "cancelledById", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryAttested", "deliveryAttestedAt", "deliveryDeadline", "deliverySignature", "deliverySignatureDriverId", "deliverySignerName", "deliveryTempException", "deliveryTempRecordedAt", "deliveryTemperature", "driverDenialNotes", "driverDenialReason", "driverDeniedAt", "driverId", "driverQuoteAmount", "driverQuoteExpiresAt", "driverQuoteNotes", "driverQuoteSubmittedAt", "dropoffFacilityId", "emailFrom", "emailSubject", "estimatedContainers", "estimatedWeightKg", "id", "invoiceId", "invoicedAt", "lastDeniedByDriverId", "lateDeliveryFlag", "lateDeliveryReasonNotes", "pickupAttested", "pickupAttestedAt", "pickupFacilityId", "pickupSignature", "pickupSignatureDriverId", "pickupSignerName", "pickupTempException", "pickupTempRecordedAt", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "rawEmailContent", "readyTime", "serviceType", "shipperId", "shipperQuoteDecision", "shipperQuoteDecisionAt", "signatureFallbackPhoto", "signatureUnavailableReason", "specimenCategory", "status", "suggestedRateMax", "suggestedRateMin", "temperatureExceptionNotes", "temperatureMax", "temperatureMin", "temperatureRequirement", "updatedAt" FROM "LoadRequest";
DROP TABLE "LoadRequest";
ALTER TABLE "new_LoadRequest" RENAME TO "LoadRequest";
CREATE UNIQUE INDEX "LoadRequest_publicTrackingCode_key" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_driverId_idx" ON "LoadRequest"("driverId");
CREATE INDEX "LoadRequest_vehicleId_idx" ON "LoadRequest"("vehicleId");
CREATE INDEX "LoadRequest_publicTrackingCode_idx" ON "LoadRequest"("publicTrackingCode");
CREATE INDEX "LoadRequest_shipperId_idx" ON "LoadRequest"("shipperId");
CREATE INDEX "LoadRequest_status_idx" ON "LoadRequest"("status");
CREATE INDEX "LoadRequest_createdAt_idx" ON "LoadRequest"("createdAt");
CREATE TABLE "new_Shipper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "shipperCode" TEXT,
    "clientType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "deletedReason" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET_14',
    "billingContactName" TEXT,
    "billingContactEmail" TEXT,
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "stripeCustomerId" TEXT,
    "smsNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsPhoneNumber" TEXT,
    "subscriptionTier" TEXT NOT NULL DEFAULT 'STANDARD',
    "dedicatedDispatcherId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shipper" ("billingAddressLine1", "billingAddressLine2", "billingCity", "billingContactEmail", "billingContactName", "billingPostalCode", "billingState", "clientType", "companyName", "contactName", "createdAt", "email", "id", "isActive", "passwordHash", "paymentTerms", "phone", "shipperCode", "stripeCustomerId", "updatedAt") SELECT "billingAddressLine1", "billingAddressLine2", "billingCity", "billingContactEmail", "billingContactName", "billingPostalCode", "billingState", "clientType", "companyName", "contactName", "createdAt", "email", "id", "isActive", "passwordHash", "paymentTerms", "phone", "shipperCode", "stripeCustomerId", "updatedAt" FROM "Shipper";
DROP TABLE "Shipper";
ALTER TABLE "new_Shipper" RENAME TO "Shipper";
CREATE UNIQUE INDEX "Shipper_shipperCode_key" ON "Shipper"("shipperCode");
CREATE UNIQUE INDEX "Shipper_email_key" ON "Shipper"("email");
CREATE INDEX "Shipper_email_idx" ON "Shipper"("email");
CREATE INDEX "Shipper_companyName_idx" ON "Shipper"("companyName");
CREATE INDEX "Shipper_isActive_idx" ON "Shipper"("isActive");
CREATE INDEX "Shipper_deletedAt_idx" ON "Shipper"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BlockedEmail_email_key" ON "BlockedEmail"("email");

-- CreateIndex
CREATE INDEX "BlockedEmail_email_idx" ON "BlockedEmail"("email");

-- CreateIndex
CREATE INDEX "BlockedEmail_isActive_idx" ON "BlockedEmail"("isActive");

-- CreateIndex
CREATE INDEX "LoadTemplate_shipperId_idx" ON "LoadTemplate"("shipperId");

-- CreateIndex
CREATE INDEX "LoadTemplate_isActive_idx" ON "LoadTemplate"("isActive");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_driverId_isRead_idx" ON "Notification"("driverId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_loadRequestId_idx" ON "Notification"("loadRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverRating_loadRequestId_key" ON "DriverRating"("loadRequestId");

-- CreateIndex
CREATE INDEX "DriverRating_driverId_idx" ON "DriverRating"("driverId");

-- CreateIndex
CREATE INDEX "DriverRating_shipperId_idx" ON "DriverRating"("shipperId");

-- CreateIndex
CREATE INDEX "DriverRating_loadRequestId_idx" ON "DriverRating"("loadRequestId");

-- CreateIndex
CREATE INDEX "DriverRating_rating_idx" ON "DriverRating"("rating");

-- CreateIndex
CREATE INDEX "GPSTrackingPoint_loadRequestId_timestamp_idx" ON "GPSTrackingPoint"("loadRequestId", "timestamp");

-- CreateIndex
CREATE INDEX "GPSTrackingPoint_driverId_idx" ON "GPSTrackingPoint"("driverId");

-- CreateIndex
CREATE INDEX "GPSTrackingPoint_timestamp_idx" ON "GPSTrackingPoint"("timestamp");

-- CreateIndex
CREATE INDEX "Vehicle_driverId_idx" ON "Vehicle"("driverId");

-- CreateIndex
CREATE INDEX "Vehicle_isActive_idx" ON "Vehicle"("isActive");

-- CreateIndex
CREATE INDEX "DriverDocument_driverId_idx" ON "DriverDocument"("driverId");

-- CreateIndex
CREATE INDEX "DriverDocument_type_idx" ON "DriverDocument"("type");

-- CreateIndex
CREATE INDEX "DriverDocument_isActive_idx" ON "DriverDocument"("isActive");

-- CreateIndex
CREATE INDEX "DriverDocument_expiryDate_idx" ON "DriverDocument"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "DriverEquipmentChecklist_driverId_key" ON "DriverEquipmentChecklist"("driverId");

-- CreateIndex
CREATE INDEX "DriverEquipmentChecklist_driverId_idx" ON "DriverEquipmentChecklist"("driverId");

-- CreateIndex
CREATE INDEX "DriverEquipmentChecklist_approvedAt_idx" ON "DriverEquipmentChecklist"("approvedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentItem_name_key" ON "EquipmentItem"("name");

-- CreateIndex
CREATE INDEX "EquipmentItem_isRequired_idx" ON "EquipmentItem"("isRequired");

-- CreateIndex
CREATE INDEX "EquipmentItem_category_idx" ON "EquipmentItem"("category");

-- CreateIndex
CREATE INDEX "EquipmentItem_isActive_idx" ON "EquipmentItem"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CallbackQueue_loadRequestId_key" ON "CallbackQueue"("loadRequestId");

-- CreateIndex
CREATE INDEX "CallbackQueue_shipperId_idx" ON "CallbackQueue"("shipperId");

-- CreateIndex
CREATE INDEX "CallbackQueue_status_idx" ON "CallbackQueue"("status");

-- CreateIndex
CREATE INDEX "CallbackQueue_position_idx" ON "CallbackQueue"("position");

-- CreateIndex
CREATE INDEX "CallbackQueue_createdAt_idx" ON "CallbackQueue"("createdAt");

-- CreateIndex
CREATE INDEX "CallbackQueue_driverId_idx" ON "CallbackQueue"("driverId");

-- CreateIndex
CREATE INDEX "CallbackQueue_loadRequestId_idx" ON "CallbackQueue"("loadRequestId");

-- CreateIndex
CREATE INDEX "CallbackQueue_priority_idx" ON "CallbackQueue"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_userType_idx" ON "PasswordResetToken"("userId", "userType");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "LoginAttempt_email_userType_idx" ON "LoginAttempt"("email", "userType");

-- CreateIndex
CREATE INDEX "LoginAttempt_ipAddress_idx" ON "LoginAttempt"("ipAddress");

-- CreateIndex
CREATE INDEX "LoginAttempt_createdAt_idx" ON "LoginAttempt"("createdAt");

-- CreateIndex
CREATE INDEX "LoadNote_loadRequestId_idx" ON "LoadNote"("loadRequestId");

-- CreateIndex
CREATE INDEX "LoadNote_createdAt_idx" ON "LoadNote"("createdAt");

-- CreateIndex
CREATE INDEX "LoadNote_createdBy_idx" ON "LoadNote"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_shipperId_key" ON "NotificationPreferences"("shipperId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreferences_driverId_key" ON "NotificationPreferences"("driverId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_shipperId_idx" ON "NotificationPreferences"("shipperId");

-- CreateIndex
CREATE INDEX "NotificationPreferences_driverId_idx" ON "NotificationPreferences"("driverId");

-- CreateIndex
CREATE INDEX "LoadDraft_driverId_idx" ON "LoadDraft"("driverId");

-- CreateIndex
CREATE INDEX "LoadDraft_updatedAt_idx" ON "LoadDraft"("updatedAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_idx" ON "AuditLog"("entityType");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_userType_idx" ON "AuditLog"("userType");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_success_idx" ON "AuditLog"("success");

-- CreateIndex
CREATE INDEX "LoadRequestLocation_loadRequestId_locationType_sequence_idx" ON "LoadRequestLocation"("loadRequestId", "locationType", "sequence");

-- CreateIndex
CREATE INDEX "LoadRequestLocation_facilityId_idx" ON "LoadRequestLocation"("facilityId");

-- CreateIndex
CREATE INDEX "LoadRequestLocation_loadRequestId_idx" ON "LoadRequestLocation"("loadRequestId");

-- CreateIndex
CREATE INDEX "TrackingEvent_code_idx" ON "TrackingEvent"("code");
