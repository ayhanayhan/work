CREATE INDEX IF NOT EXISTS "Order_storeId_createdAt_idx" ON "Order"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_storeId_paymentStatus_createdAt_idx" ON "Order"("storeId", "paymentStatus", "createdAt");
CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX IF NOT EXISTS "OrderItem_variantId_idx" ON "OrderItem"("variantId");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_createdAt_idx" ON "WebhookDelivery"("endpointId", "createdAt");
CREATE INDEX IF NOT EXISTS "WebhookDelivery_endpointId_statusCode_createdAt_idx" ON "WebhookDelivery"("endpointId", "statusCode", "createdAt");
