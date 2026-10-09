/*
  Warnings:

  - A unique constraint covering the columns `[poId,productId]` on the table `po_item` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "POStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "POStatus" ADD VALUE 'PARTIALLY_FULFILLED';

-- CreateIndex
CREATE INDEX "po_item_poId_idx" ON "po_item"("poId");

-- CreateIndex
CREATE INDEX "po_item_productId_idx" ON "po_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "po_item_poId_productId_key" ON "po_item"("poId", "productId");

-- CreateIndex
CREATE INDEX "purchase_order_supplierId_idx" ON "purchase_order"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_order_po_status_idx" ON "purchase_order"("po_status");

-- CreateIndex
CREATE INDEX "purchase_order_order_date_idx" ON "purchase_order"("order_date");
