-- AlterEnum
ALTER TYPE "AssignedRole" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "stock_movement" ADD COLUMN     "current_uom" TEXT NOT NULL DEFAULT 'pcs';
