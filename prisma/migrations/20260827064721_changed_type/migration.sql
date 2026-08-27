/*
  Warnings:

  - The `unit_of_measure` column on the `transaction_item` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "transaction_item" DROP COLUMN "unit_of_measure",
ADD COLUMN     "unit_of_measure" "UnitOfMeasure" NOT NULL DEFAULT 'PCS';
