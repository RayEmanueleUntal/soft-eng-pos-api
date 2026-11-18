-- AlterTable
ALTER TABLE "delivery_item" ALTER COLUMN "received_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "actual_base_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "uom_conversion_factor" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "exchange" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "po_item" ALTER COLUMN "requested_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "expected_base_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "uom_conversion_factor" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "product" ALTER COLUMN "current_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "reorder_point_ROP" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "product_uom" ALTER COLUMN "conversion_factor" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "return" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "stock_movement" ALTER COLUMN "quantity_changed" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "new_quantity" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "previous_quantity" SET DATA TYPE DECIMAL(18,3);

-- AlterTable
ALTER TABLE "transaction_item" ALTER COLUMN "quantity_sold" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "base_quantity_deducted" SET DATA TYPE DECIMAL(18,3),
ALTER COLUMN "uom_conversion_factor" SET DATA TYPE DECIMAL(18,3);
