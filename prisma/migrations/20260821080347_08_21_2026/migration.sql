/*
  Warnings:

  - The values [STOCK_IN,STOCK_OUT] on the enum `MovementType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `quantity` on the `exchange` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `requested_quantity` on the `po_item` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `current_quantity` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `reorder_point_ROP` on the `product` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `quantity` on the `return` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to alter the column `quantity_changed` on the `stock_movement` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - You are about to drop the column `applied_price` on the `transaction_item` table. All the data in the column will be lost.
  - You are about to alter the column `quantity_sold` on the `transaction_item` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.
  - A unique constraint covering the columns `[aisle_number,shelf_location]` on the table `bin_location` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[sku]` on the table `product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[invoice_number]` on the table `transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unit_cost` to the `po_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `new_quantity` to the `stock_movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `previous_quantity` to the `stock_movement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `transaction_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `transaction_item` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('COMPLETED', 'PENDING', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- AlterEnum
BEGIN;
CREATE TYPE "MovementType_new" AS ENUM ('IN', 'OUT', 'SALE', 'RETURN', 'ADJUSTMENT');
ALTER TABLE "stock_movement" ALTER COLUMN "type" TYPE "MovementType_new" USING ("type"::text::"MovementType_new");
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
ALTER TYPE "MovementType_new" RENAME TO "MovementType";
DROP TYPE "public"."MovementType_old";
COMMIT;

-- AlterTable
ALTER TABLE "exchange" ALTER COLUMN "quantity" SET DEFAULT 1.000,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "po_item" ADD COLUMN     "unit_cost" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "requested_quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "base_uom" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "needsRecount" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pricing_unit_qty" DECIMAL(10,3) NOT NULL DEFAULT 1.000,
ADD COLUMN     "pricing_uom" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN     "sku" TEXT,
ALTER COLUMN "size_dimensions" DROP NOT NULL,
ALTER COLUMN "thread_type" DROP NOT NULL,
ALTER COLUMN "material_grade" DROP NOT NULL,
ALTER COLUMN "current_quantity" SET DEFAULT 0.00,
ALTER COLUMN "current_quantity" SET DATA TYPE DECIMAL(10,3),
ALTER COLUMN "reorder_point_ROP" SET DEFAULT 0.00,
ALTER COLUMN "reorder_point_ROP" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "return" ALTER COLUMN "quantity" SET DEFAULT 1.000,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "isOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "new_quantity" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "previous_quantity" DECIMAL(10,3) NOT NULL,
ALTER COLUMN "quantity_changed" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "transaction" ADD COLUMN     "discount_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "invoice_number" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "tax_total" DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "transaction_item" DROP COLUMN "applied_price",
ADD COLUMN     "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "subtotal" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "unit_of_measure" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN     "unit_price" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "quantity_sold" SET DATA TYPE DECIMAL(10,3);

-- CreateTable
CREATE TABLE "delivery_item" (
    "id" SERIAL NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "received_quantity" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "delivery_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bin_location_aisle_number_shelf_location_key" ON "bin_location"("aisle_number", "shelf_location");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "product_name_idx" ON "product"("name");

-- CreateIndex
CREATE INDEX "product_binId_idx" ON "product"("binId");

-- CreateIndex
CREATE INDEX "stock_movement_productId_idx" ON "stock_movement"("productId");

-- CreateIndex
CREATE INDEX "stock_movement_date_idx" ON "stock_movement"("date");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_invoice_number_key" ON "transaction"("invoice_number");

-- CreateIndex
CREATE INDEX "transaction_date_idx" ON "transaction"("date");

-- CreateIndex
CREATE INDEX "transaction_staffId_idx" ON "transaction"("staffId");

-- CreateIndex
CREATE INDEX "transaction_customerId_idx" ON "transaction"("customerId");

-- CreateIndex
CREATE INDEX "transaction_item_transactionId_idx" ON "transaction_item"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_item_productId_idx" ON "transaction_item"("productId");

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_item" ADD CONSTRAINT "delivery_item_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_item" ADD CONSTRAINT "delivery_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
