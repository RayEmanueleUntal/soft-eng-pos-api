-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('OVERRIDE_DISCOUNT', 'STOCK_OUT_OVERRIDE', 'REFUND_EXCEED_LIMIT', 'DELETE_TRANSACTION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "approval_request" (
    "id" SERIAL NOT NULL,
    "type" "RequestType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedById" INTEGER NOT NULL,
    "reviewedById" INTEGER,
    "payload" JSONB NOT NULL,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_setting_pkey" PRIMARY KEY ("key")
);

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_request" ADD CONSTRAINT "approval_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "staff_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
