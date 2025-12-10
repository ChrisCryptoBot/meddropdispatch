-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Driver" (
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
    "paymentMethod" TEXT,
    "bankName" TEXT,
    "accountHolderName" TEXT,
    "routingNumber" TEXT,
    "accountNumber" TEXT,
    "accountType" TEXT,
    "payoutFrequency" TEXT,
    "minimumPayout" REAL DEFAULT 100,
    "taxId" TEXT,
    "taxIdType" TEXT,
    "w9Submitted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Driver" ("createdAt", "email", "emergencyContact", "emergencyPhone", "firstName", "hasRefrigeration", "hipaaTrainingDate", "hiredDate", "id", "lastName", "licenseExpiry", "licenseNumber", "passwordHash", "phone", "status", "un3373Certified", "un3373ExpiryDate", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlate", "vehicleType", "vehicleYear") SELECT "createdAt", "email", "emergencyContact", "emergencyPhone", "firstName", "hasRefrigeration", "hipaaTrainingDate", "hiredDate", "id", "lastName", "licenseExpiry", "licenseNumber", "passwordHash", "phone", "status", "un3373Certified", "un3373ExpiryDate", "updatedAt", "vehicleMake", "vehicleModel", "vehiclePlate", "vehicleType", "vehicleYear" FROM "Driver";
DROP TABLE "Driver";
ALTER TABLE "new_Driver" RENAME TO "Driver";
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");
CREATE INDEX "Driver_email_idx" ON "Driver"("email");
CREATE INDEX "Driver_status_idx" ON "Driver"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
