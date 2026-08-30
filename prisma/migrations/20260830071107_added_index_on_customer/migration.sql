-- CreateIndex
CREATE INDEX "customer_name_contact_number_idx" ON "customer"("name", "contact_number");

-- CreateIndex
CREATE INDEX "customer_contact_number_idx" ON "customer"("contact_number");
