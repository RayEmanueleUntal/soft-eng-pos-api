/*
  Warnings:

  - You are about to drop the column `pricing_unit_qty` on the `product` table. All the data in the column will be lost.
  - You are about to drop the column `pricing_uom` on the `product` table. All the data in the column will be lost.
  - Added the required column `actual_base_quantity` to the `delivery_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expected_base_quantity` to the `po_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `base_quantity_deducted` to the `transaction_item` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CreditStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

-- AlterEnum
ALTER TYPE "UnitOfMeasure" ADD VALUE 'SACK';

-- AlterTable
ALTER TABLE "credit_payment" ADD COLUMN     "status" "CreditStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "delivery_item" ADD COLUMN     "actual_base_quantity" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "received_uom" "UnitOfMeasure" NOT NULL DEFAULT 'PCS',
ADD COLUMN     "uom_conversion_factor" DECIMAL(10,3) NOT NULL DEFAULT 1.000;

-- AlterTable
ALTER TABLE "po_item" ADD COLUMN     "expected_base_quantity" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "ordered_uom" "UnitOfMeasure" NOT NULL DEFAULT 'PCS',
ADD COLUMN     "uom_conversion_factor" DECIMAL(10,3) NOT NULL DEFAULT 1.000;

-- AlterTable
ALTER TABLE "product" DROP COLUMN "pricing_unit_qty",
DROP COLUMN "pricing_uom";

-- AlterTable
ALTER TABLE "transaction_item" ADD COLUMN     "base_quantity_deducted" DECIMAL(10,3) NOT NULL,
ADD COLUMN     "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "uom_conversion_factor" DECIMAL(10,3) NOT NULL DEFAULT 1.000;

-- CreateTable
CREATE TABLE "customer_payment" (
    "id" SERIAL NOT NULL,
    "wholesaleCustId" INTEGER NOT NULL,
    "staffId" INTEGER NOT NULL,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "previous_balance" DECIMAL(10,2) NOT NULL,
    "new_balance" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "customer_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_uom" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "uom" "UnitOfMeasure" NOT NULL,
    "conversion_factor" DECIMAL(10,3) NOT NULL,
    "cost_price" DECIMAL(10,2),
    "retail_price" DECIMAL(10,2),
    "wholesale_price" DECIMAL(10,2),
    "is_default_purchase" BOOLEAN NOT NULL DEFAULT false,
    "is_default_sales" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "product_uom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_payment_wholesaleCustId_idx" ON "customer_payment"("wholesaleCustId");

-- CreateIndex
CREATE INDEX "customer_payment_payment_date_idx" ON "customer_payment"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "product_uom_productId_uom_key" ON "product_uom"("productId", "uom");

-- CreateIndex
CREATE INDEX "credit_payment_due_date_idx" ON "credit_payment"("due_date");

-- CreateIndex
CREATE INDEX "credit_payment_status_idx" ON "credit_payment"("status");

-- AddForeignKey
ALTER TABLE "customer_payment" ADD CONSTRAINT "customer_payment_wholesaleCustId_fkey" FOREIGN KEY ("wholesaleCustId") REFERENCES "wholesale_profile"("customerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_payment" ADD CONSTRAINT "customer_payment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_uom" ADD CONSTRAINT "product_uom_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
