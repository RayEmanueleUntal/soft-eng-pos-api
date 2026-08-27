/*
  Warnings:

  - The `base_uom` column on the `product` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `pricing_uom` column on the `product` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('PCS', 'BOX', 'SET', 'KG', 'G', 'METER', 'HUNDRED', 'GROSS', 'SACKs');

-- AlterTable
ALTER TABLE "product" DROP COLUMN "base_uom",
ADD COLUMN     "base_uom" "UnitOfMeasure" NOT NULL DEFAULT 'PCS',
DROP COLUMN "pricing_uom",
ADD COLUMN     "pricing_uom" "UnitOfMeasure" NOT NULL DEFAULT 'PCS';
