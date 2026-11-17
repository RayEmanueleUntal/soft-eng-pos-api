/*
  Warnings:

  - You are about to drop the column `is_within_7_days` on the `exchange` table. All the data in the column will be lost.
  - You are about to drop the column `price_difference` on the `exchange` table. All the data in the column will be lost.
  - Added the required column `staffId` to the `exchange` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('DEFECTIVE', 'CHANGE_OF_MIND');

-- AlterTable
ALTER TABLE "exchange" DROP COLUMN "is_within_7_days",
DROP COLUMN "price_difference",
ADD COLUMN     "staffId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "return" ADD COLUMN     "condition" "ItemCondition" NOT NULL DEFAULT 'DEFECTIVE';

-- CreateIndex
CREATE INDEX "exchange_transactionId_productId_idx" ON "exchange"("transactionId", "productId");

-- CreateIndex
CREATE INDEX "exchange_productId_idx" ON "exchange"("productId");

-- CreateIndex
CREATE INDEX "exchange_staffId_idx" ON "exchange"("staffId");

-- CreateIndex
CREATE INDEX "exchange_date_idx" ON "exchange"("date");

-- CreateIndex
CREATE INDEX "return_transactionId_productId_idx" ON "return"("transactionId", "productId");

-- CreateIndex
CREATE INDEX "return_productId_idx" ON "return"("productId");

-- CreateIndex
CREATE INDEX "return_staffId_idx" ON "return"("staffId");

-- CreateIndex
CREATE INDEX "return_date_idx" ON "return"("date");

-- AddForeignKey
ALTER TABLE "exchange" ADD CONSTRAINT "exchange_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
