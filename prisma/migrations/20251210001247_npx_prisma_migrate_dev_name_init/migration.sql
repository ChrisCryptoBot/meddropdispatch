-- CreateTable
CREATE TABLE "Shipper" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "clientType" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shipperId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "defaultAccessNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facility_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LoadRequest" (
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
    "quoteAmount" REAL,
    "quoteCurrency" TEXT NOT NULL DEFAULT 'USD',
    "quoteNotes" TEXT,
    "createdVia" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LoadRequest_shipperId_fkey" FOREIGN KEY ("shipperId") REFERENCES "Shipper" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_pickupFacilityId_fkey" FOREIGN KEY ("pickupFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LoadRequest_dropoffFacilityId_fkey" FOREIGN KEY ("dropoffFacilityId") REFERENCES "Facility" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackingEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "locationText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackingEvent_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "loadRequestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_loadRequestId_fkey" FOREIGN KEY ("loadRequestId") REFERENCES "LoadRequest" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Shipper_email_idx" ON "Shipper"("email");

-- CreateIndex
CREATE INDEX "Shipper_companyName_idx" ON "Shipper"("companyName");

-- CreateIndex
CREATE INDEX "Facility_shipperId_idx" ON "Facility"("shipperId");

-- CreateIndex
CREATE UNIQUE INDEX "LoadRequest_publicTrackingCode_key" ON "LoadRequest"("publicTrackingCode");

-- CreateIndex
CREATE INDEX "LoadRequest_publicTrackingCode_idx" ON "LoadRequest"("publicTrackingCode");

-- CreateIndex
CREATE INDEX "LoadRequest_shipperId_idx" ON "LoadRequest"("shipperId");

-- CreateIndex
CREATE INDEX "LoadRequest_status_idx" ON "LoadRequest"("status");

-- CreateIndex
CREATE INDEX "LoadRequest_createdAt_idx" ON "LoadRequest"("createdAt");

-- CreateIndex
CREATE INDEX "TrackingEvent_loadRequestId_idx" ON "TrackingEvent"("loadRequestId");

-- CreateIndex
CREATE INDEX "TrackingEvent_createdAt_idx" ON "TrackingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "Document_loadRequestId_idx" ON "Document"("loadRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
