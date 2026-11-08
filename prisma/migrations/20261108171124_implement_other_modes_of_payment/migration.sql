-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'BANK_TRANSFER';

-- CreateTable
CREATE TABLE "check_payment" (
    "paymentId" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "check_number" TEXT NOT NULL,
    "check_date" TIMESTAMP(3),
    "is_cleared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "check_payment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "bank_transfer_payment" (
    "paymentId" INTEGER NOT NULL,
    "bank_name" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,

    CONSTRAINT "bank_transfer_payment_pkey" PRIMARY KEY ("paymentId")
);

-- AddForeignKey
ALTER TABLE "check_payment" ADD CONSTRAINT "check_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transfer_payment" ADD CONSTRAINT "bank_transfer_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
