/*
  Warnings:

- A unique constraint covering the columns `[company_name]` on the table `forwarder` will be added. If there are existing duplicate values, this will fail.
- Added the required column `updatedAt` to the `forwarder` table without a default value. This is not possible if the table is not empty.
- Added the required column `updatedAt` to the `shipment` table without a default value. This is not possible if the table is not empty.

*/

-- 1. Add columns with a temporary DEFAULT CURRENT_TIMESTAMP so existing rows get populated
ALTER TABLE "forwarder" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "shipment" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "tracking_number" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP; -- <--- Added DEFAULT CURRENT_TIMESTAMP here

-- 2. Drop the DEFAULT constraint so Prisma handles @updatedAt dynamically going forward
ALTER TABLE "forwarder" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "shipment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- 3. Create Indexes
CREATE UNIQUE INDEX "forwarder_company_name_key" ON "forwarder"("company_name");

CREATE INDEX "forwarder_company_name_idx" ON "forwarder"("company_name");

CREATE INDEX "forwarder_is_active_idx" ON "forwarder"("is_active");

CREATE INDEX "shipment_tracking_status_idx" ON "shipment"("tracking_status");

CREATE INDEX "shipment_forwarderId_idx" ON "shipment"("forwarderId");

CREATE INDEX "shipment_transactionId_idx" ON "shipment"("transactionId");

CREATE INDEX "shipment_dispatch_date_idx" ON "shipment"("dispatch_date");