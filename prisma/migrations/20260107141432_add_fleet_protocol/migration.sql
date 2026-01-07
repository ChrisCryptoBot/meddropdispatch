-- CreateTable: Fleet
CREATE TABLE "Fleet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "ownerId" TEXT NOT NULL UNIQUE,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Fleet_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: FleetInvite
CREATE TABLE "FleetInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fleetId" TEXT NOT NULL,
    "code" TEXT NOT NULL UNIQUE,
    "role" TEXT NOT NULL DEFAULT 'DRIVER',
    "expiresAt" DATETIME,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "FleetInvite_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FleetInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Driver" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable: Driver - Add Fleet fields
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
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
    "fleetId" TEXT,
    "fleetRole" TEXT DEFAULT 'INDEPENDENT',
    "canBeAssignedLoads" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedBy" TEXT,
    "deletedReason" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Driver_fleetId_fkey" FOREIGN KEY ("fleetId") REFERENCES "Fleet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Driver" SELECT 
    "id", "firstName", "lastName", "email", "phone", "passwordHash", "licenseNumber", "licenseExpiry", 
    "status", "vehicleType", "vehicleMake", "vehicleModel", "vehicleYear", "vehiclePlate", 
    "hasRefrigeration", "un3373Certified", "un3373ExpiryDate", "hipaaTrainingDate", "hiredDate", 
    "emergencyContact", "emergencyPhone", "profilePicture", "bio", "specialties", "yearsOfExperience", 
    "languages", "serviceAreas", "minimumRatePerMile", "isAdmin", 
    NULL as "fleetId", 'INDEPENDENT' as "fleetRole", true as "canBeAssignedLoads",
    "createdAt", "updatedAt", "deletedAt", "deletedBy", "deletedReason", "isDeleted"
FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
PRAGMA foreign_keys=ON;

-- AlterTable: Invoice - Add Payee fields
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL UNIQUE,
    "shipperId" TEXT NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "createdByDriverId" TEXT,
    "payeeType" TEXT,
    "payeeDriverId" TEXT,
    "payeeFleetId" TEXT,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0.0,
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
    CONSTRAINT "Invoice_createdByDriverId_fkey" FOREIGN KEY ("createdByDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_payeeDriverId_fkey" FOREIGN KEY ("payeeDriverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Invoice_payeeFleetId_fkey" FOREIGN KEY ("payeeFleetId") REFERENCES "Fleet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Invoice" SELECT 
    "id", "invoiceNumber", "shipperId", "invoiceDate", "dueDate", "createdByDriverId",
    NULL as "payeeType", NULL as "payeeDriverId", NULL as "payeeFleetId",
    "subtotal", "tax", "total", "status", "sentAt", "paidAt", "paymentMethod", 
    "paymentReference", "notes", "createdAt", "updatedAt"
FROM "Invoice";
DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Fleet_ownerId_idx" ON "Fleet"("ownerId");
CREATE INDEX "FleetInvite_code_idx" ON "FleetInvite"("code");
CREATE INDEX "FleetInvite_fleetId_idx" ON "FleetInvite"("fleetId");
CREATE INDEX "FleetInvite_createdById_idx" ON "FleetInvite"("createdById");
CREATE INDEX "Driver_fleetId_idx" ON "Driver"("fleetId");
CREATE INDEX "Driver_fleetRole_idx" ON "Driver"("fleetRole");
CREATE INDEX "Invoice_payeeDriverId_idx" ON "Invoice"("payeeDriverId");
CREATE INDEX "Invoice_payeeFleetId_idx" ON "Invoice"("payeeFleetId");

