-- CreateTable
CREATE TABLE "Invoice" (
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
    "stripeInvoiceId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
INSERT INTO "new_LoadRequest" ("acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt") SELECT "acceptedByDriverAt", "accessNotes", "actualDeliveryTime", "actualPickupTime", "assignedAt", "commodityDescription", "createdAt", "createdVia", "declaredValue", "deliveryDeadline", "deliverySignature", "deliverySignerName", "deliveryTemperature", "driverId", "dropoffFacilityId", "estimatedContainers", "estimatedWeightKg", "id", "pickupFacilityId", "pickupSignature", "pickupSignerName", "pickupTemperature", "preferredContactMethod", "publicTrackingCode", "quoteAcceptedAt", "quoteAmount", "quoteCurrency", "quoteNotes", "readyTime", "serviceType", "shipperId", "specimenCategory", "status", "temperatureRequirement", "updatedAt" FROM "LoadRequest";
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
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET_14',
    "billingContactName" TEXT,
    "billingContactEmail" TEXT,
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPostalCode" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shipper" ("clientType", "companyName", "contactName", "createdAt", "email", "id", "isActive", "passwordHash", "phone", "updatedAt") SELECT "clientType", "companyName", "contactName", "createdAt", "email", "id", "isActive", "passwordHash", "phone", "updatedAt" FROM "Shipper";
DROP TABLE "Shipper";
ALTER TABLE "new_Shipper" RENAME TO "Shipper";
CREATE UNIQUE INDEX "Shipper_email_key" ON "Shipper"("email");
CREATE INDEX "Shipper_email_idx" ON "Shipper"("email");
CREATE INDEX "Shipper_companyName_idx" ON "Shipper"("companyName");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_shipperId_idx" ON "Invoice"("shipperId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "Invoice_invoiceNumber_idx" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");
