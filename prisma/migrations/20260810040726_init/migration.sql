-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "AssignedRole" AS ENUM ('MANAGER', 'SECRETARY', 'CASHIER', 'SALES_CLERK', 'STOCK_MANAGEMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'GCASH', 'CREDIT');

-- CreateEnum
CREATE TYPE "TrackingStatus" AS ENUM ('PENDING', 'DISPATCHED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT');

-- CreateEnum
CREATE TYPE "POStatus" AS ENUM ('PENDING', 'FULFILLED');

-- CreateTable
CREATE TABLE "transaction" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grand_total" DECIMAL(10,2) NOT NULL,
    "transaction_type" "TransactionType" NOT NULL DEFAULT 'RETAIL',
    "customerId" INTEGER,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_item" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity_sold" INTEGER NOT NULL,
    "applied_price" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "transaction_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "price_difference" DECIMAL(10,2) NOT NULL,
    "is_within_7_days" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exchange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "defect_reason" TEXT NOT NULL,
    "refund_amount" DECIMAL(10,2) NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_paid" DECIMAL(10,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_payment" (
    "paymentId" INTEGER NOT NULL,
    "cash_tendered" DECIMAL(10,2) NOT NULL,
    "change_given" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "cash_payment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "gcash_payment" (
    "paymentId" INTEGER NOT NULL,
    "reference_number" TEXT NOT NULL,
    "gcash_mobile_number" TEXT NOT NULL,

    CONSTRAINT "gcash_payment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "credit_payment" (
    "paymentId" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "remaining_credit_balance" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "credit_payment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "shipment" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "forwarderId" INTEGER NOT NULL,
    "dispatch_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracking_status" "TrackingStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forwarder" (
    "id" SERIAL NOT NULL,
    "company_name" TEXT NOT NULL,
    "tracking_contact_info" TEXT NOT NULL,

    CONSTRAINT "forwarder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_user" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "assigned_role" "AssignedRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "staff_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_number" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'RETAIL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wholesale_profile" (
    "customerId" INTEGER NOT NULL,
    "credit_limit" DECIMAL(10,2) NOT NULL,
    "outstanding_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "company_name" TEXT NOT NULL,

    CONSTRAINT "wholesale_profile_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "size_dimensions" TEXT NOT NULL,
    "thread_type" TEXT NOT NULL,
    "material_grade" TEXT NOT NULL,
    "current_quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_point_ROP" INTEGER NOT NULL DEFAULT 10,
    "retail_price" DECIMAL(10,2) NOT NULL,
    "wholesale_price" DECIMAL(10,2),
    "binId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bin_location" (
    "id" SERIAL NOT NULL,
    "aisle_number" TEXT NOT NULL,
    "shelf_location" TEXT NOT NULL,

    CONSTRAINT "bin_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movement" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MovementType" NOT NULL,
    "quantity_changed" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "stock_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "po_status" "POStatus" NOT NULL DEFAULT 'PENDING',
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_item" (
    "id" SERIAL NOT NULL,
    "poId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "requested_quantity" INTEGER NOT NULL,

    CONSTRAINT "po_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "contact_info" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "lead_time_days" INTEGER NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery" (
    "id" SERIAL NOT NULL,
    "poId" INTEGER NOT NULL,
    "delivery_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "staffId" INTEGER NOT NULL,

    CONSTRAINT "delivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_user_username_key" ON "staff_user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "category_name_key" ON "category"("name");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_item" ADD CONSTRAINT "transaction_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange" ADD CONSTRAINT "exchange_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange" ADD CONSTRAINT "exchange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return" ADD CONSTRAINT "return_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return" ADD CONSTRAINT "return_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return" ADD CONSTRAINT "return_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_payment" ADD CONSTRAINT "cash_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gcash_payment" ADD CONSTRAINT "gcash_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_payment" ADD CONSTRAINT "credit_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment" ADD CONSTRAINT "shipment_forwarderId_fkey" FOREIGN KEY ("forwarderId") REFERENCES "forwarder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wholesale_profile" ADD CONSTRAINT "wholesale_profile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_binId_fkey" FOREIGN KEY ("binId") REFERENCES "bin_location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movement" ADD CONSTRAINT "stock_movement_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_item" ADD CONSTRAINT "po_item_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_item" ADD CONSTRAINT "po_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery" ADD CONSTRAINT "delivery_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
