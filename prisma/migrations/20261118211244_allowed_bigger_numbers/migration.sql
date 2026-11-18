-- DropIndex
DROP INDEX "product_name_idx";

-- AlterTable
ALTER TABLE "cash_payment" ALTER COLUMN "cash_tendered" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "change_given" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "credit_payment" ALTER COLUMN "remaining_credit_balance" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "customer_payment" ALTER COLUMN "amount_paid" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "previous_balance" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "new_balance" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "expense" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "payment" ALTER COLUMN "amount_paid" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "po_item" ALTER COLUMN "unit_cost" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "retail_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "wholesale_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "cost_price" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "product_uom" ALTER COLUMN "cost_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "retail_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "wholesale_price" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "return" ALTER COLUMN "refund_amount" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "transaction" ALTER COLUMN "grand_total" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "discount_total" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "tax_total" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "transaction_item" ALTER COLUMN "discount" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "unit_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "cost_price" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "wholesale_profile" ALTER COLUMN "credit_limit" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "outstanding_balance" SET DATA TYPE DECIMAL(18,2);

-- CreateIndex
CREATE INDEX "product_createdAt_id_idx" ON "product"("createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "product_name_id_idx" ON "product"("name", "id" DESC);

-- CreateIndex
CREATE INDEX "supplier_lead_time_days_idx" ON "supplier"("lead_time_days");
