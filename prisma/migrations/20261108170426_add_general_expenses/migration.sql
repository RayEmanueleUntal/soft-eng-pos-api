-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'UTILITIES', 'SALARIES_WAGES', 'TAXES_LICENCES', 'MAINTENANCE', 'LOGISTICS', 'SUPPLIES', 'MISCELLANEOUS');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CHECK';

-- CreateTable
CREATE TABLE "expense" (
    "id" SERIAL NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "notes" TEXT,
    "staffId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expense_date_idx" ON "expense"("date");

-- CreateIndex
CREATE INDEX "expense_category_idx" ON "expense"("category");

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
