-- AlterEnum
ALTER TYPE "RequestType" ADD VALUE 'EXCHANGE_TRANSACTION';

-- CreateIndex
CREATE INDEX "wholesale_profile_customerId_idx" ON "wholesale_profile"("customerId");
