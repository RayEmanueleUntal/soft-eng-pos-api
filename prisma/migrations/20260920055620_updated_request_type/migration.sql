/*
  Warnings:

  - The values [REFUND_EXCEED_LIMIT] on the enum `RequestType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestType_new" AS ENUM ('OVERRIDE_DISCOUNT', 'STOCK_OUT_OVERRIDE', 'DELETE_TRANSACTION', 'REFUND_TRANSACTION');
ALTER TABLE "approval_request" ALTER COLUMN "type" TYPE "RequestType_new" USING ("type"::text::"RequestType_new");
ALTER TYPE "RequestType" RENAME TO "RequestType_old";
ALTER TYPE "RequestType_new" RENAME TO "RequestType";
DROP TYPE "public"."RequestType_old";
COMMIT;
