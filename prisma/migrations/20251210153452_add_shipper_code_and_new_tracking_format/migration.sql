-- AlterTable
ALTER TABLE "Shipper" ADD COLUMN "shipperCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Shipper_shipperCode_key" ON "Shipper"("shipperCode");






