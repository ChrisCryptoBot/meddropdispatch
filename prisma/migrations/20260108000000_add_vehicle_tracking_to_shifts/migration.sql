-- Add vehicleNumber to Vehicle table
ALTER TABLE "Vehicle" ADD COLUMN "vehicleNumber" TEXT;

-- Add vehicle tracking fields to DriverShift table
ALTER TABLE "DriverShift" ADD COLUMN "vehicleId" TEXT;
ALTER TABLE "DriverShift" ADD COLUMN "clockInOdometer" INTEGER;
ALTER TABLE "DriverShift" ADD COLUMN "clockOutOdometer" INTEGER;

-- Create indexes
CREATE INDEX "DriverShift_vehicleId_idx" ON "DriverShift"("vehicleId");
CREATE INDEX "Vehicle_vehicleNumber_idx" ON "Vehicle"("vehicleNumber");
