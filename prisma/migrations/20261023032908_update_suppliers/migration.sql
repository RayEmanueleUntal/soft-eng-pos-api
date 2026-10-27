/*
  Warnings:

  - You are about to drop the column `contact_info` on the `supplier` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `supplier` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "supplier" DROP COLUMN "contact_info",
ADD COLUMN     "contact_number" TEXT,
ADD COLUMN     "contact_person" TEXT,
ADD COLUMN     "email" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "supplier_name_key" ON "supplier"("name");
