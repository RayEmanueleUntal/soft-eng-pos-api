/*
  Warnings:

  - The values [SACKs] on the enum `UnitOfMeasure` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UnitOfMeasure_new" AS ENUM ('PCS', 'BOX', 'SET', 'KG', 'G', 'METER', 'HUNDRED', 'GROSS', 'SACK', 'SMALL_BOX');
ALTER TABLE "public"."delivery_item" ALTER COLUMN "received_uom" DROP DEFAULT;
ALTER TABLE "public"."po_item" ALTER COLUMN "ordered_uom" DROP DEFAULT;
ALTER TABLE "public"."product" ALTER COLUMN "base_uom" DROP DEFAULT;
ALTER TABLE "public"."stock_movement" ALTER COLUMN "current_uom" DROP DEFAULT;
ALTER TABLE "public"."transaction_item" ALTER COLUMN "unit_of_measure" DROP DEFAULT;
ALTER TABLE "transaction_item" ALTER COLUMN "unit_of_measure" TYPE "UnitOfMeasure_new" USING ("unit_of_measure"::text::"UnitOfMeasure_new");
ALTER TABLE "product" ALTER COLUMN "base_uom" TYPE "UnitOfMeasure_new" USING ("base_uom"::text::"UnitOfMeasure_new");
ALTER TABLE "product_uom" ALTER COLUMN "uom" TYPE "UnitOfMeasure_new" USING ("uom"::text::"UnitOfMeasure_new");
ALTER TABLE "stock_movement" ALTER COLUMN "current_uom" TYPE "UnitOfMeasure_new" USING ("current_uom"::text::"UnitOfMeasure_new");
ALTER TABLE "po_item" ALTER COLUMN "ordered_uom" TYPE "UnitOfMeasure_new" USING ("ordered_uom"::text::"UnitOfMeasure_new");
ALTER TABLE "delivery_item" ALTER COLUMN "received_uom" TYPE "UnitOfMeasure_new" USING ("received_uom"::text::"UnitOfMeasure_new");
ALTER TYPE "UnitOfMeasure" RENAME TO "UnitOfMeasure_old";
ALTER TYPE "UnitOfMeasure_new" RENAME TO "UnitOfMeasure";
DROP TYPE "public"."UnitOfMeasure_old";
ALTER TABLE "delivery_item" ALTER COLUMN "received_uom" SET DEFAULT 'PCS';
ALTER TABLE "po_item" ALTER COLUMN "ordered_uom" SET DEFAULT 'PCS';
ALTER TABLE "product" ALTER COLUMN "base_uom" SET DEFAULT 'PCS';
ALTER TABLE "stock_movement" ALTER COLUMN "current_uom" SET DEFAULT 'PCS';
ALTER TABLE "transaction_item" ALTER COLUMN "unit_of_measure" SET DEFAULT 'PCS';
COMMIT;
