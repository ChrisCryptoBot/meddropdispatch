-- AlterTable: Vehicle - Add Compliance & Liability Shield fields
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Vehicle" (
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
    "registrationExpiryDate" DATETIME,
    "insuranceExpiryDate" DATETIME,
    "registrationNumber" TEXT,
    "registrationDocumentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Vehicle_registrationDocumentId_fkey" FOREIGN KEY ("registrationDocumentId") REFERENCES "DriverDocument" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Vehicle" SELECT 
    "id", "driverId", "vehicleType", "vehicleMake", "vehicleModel", "vehicleYear", 
    "vehiclePlate", "hasRefrigeration", "isActive", "nickname",
    NULL as "registrationExpiryDate", NULL as "insuranceExpiryDate", 
    NULL as "registrationNumber", NULL as "registrationDocumentId",
    "createdAt", "updatedAt"
FROM "Vehicle";
DROP TABLE "Vehicle";
ALTER TABLE "new_Vehicle" RENAME TO "Vehicle";
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "Vehicle_registrationExpiryDate_idx" ON "Vehicle"("registrationExpiryDate");

