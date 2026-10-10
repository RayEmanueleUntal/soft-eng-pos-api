-- CreateIndex
CREATE INDEX "delivery_poId_idx" ON "delivery"("poId");

-- CreateIndex
CREATE INDEX "delivery_staffId_idx" ON "delivery"("staffId");

-- CreateIndex
CREATE INDEX "delivery_delivery_date_idx" ON "delivery"("delivery_date");

-- CreateIndex
CREATE INDEX "delivery_item_deliveryId_idx" ON "delivery_item"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_item_productId_idx" ON "delivery_item"("productId");
