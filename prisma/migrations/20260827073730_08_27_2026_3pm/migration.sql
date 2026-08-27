/*
  Warnings:

  - The `current_uom` column on the `stock_movement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "stock_movement" DROP COLUMN "current_uom",
ADD COLUMN     "current_uom" "UnitOfMeasure" NOT NULL DEFAULT 'PCS';
