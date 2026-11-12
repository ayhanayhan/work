CREATE TABLE IF NOT EXISTS "InventoryLedgerEntry" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "movementType" TEXT NOT NULL,
  "deltaOnHand" INTEGER NOT NULL DEFAULT 0,
  "deltaReserved" INTEGER NOT NULL DEFAULT 0,
  "deltaCommitted" INTEGER NOT NULL DEFAULT 0,
  "deltaIncoming" INTEGER NOT NULL DEFAULT 0,
  "deltaDamaged" INTEGER NOT NULL DEFAULT 0,
  "balanceOnHand" INTEGER NOT NULL,
  "balanceReserved" INTEGER NOT NULL,
  "balanceCommitted" INTEGER NOT NULL,
  "balanceIncoming" INTEGER NOT NULL,
  "balanceDamaged" INTEGER NOT NULL,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "actorId" TEXT,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_storeId_createdAt_idx" ON "InventoryLedgerEntry"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_warehouseId_variantId_createdAt_idx" ON "InventoryLedgerEntry"("warehouseId", "variantId", "createdAt");
CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_referenceType_referenceId_idx" ON "InventoryLedgerEntry"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "InventoryLedgerEntry_movementType_createdAt_idx" ON "InventoryLedgerEntry"("movementType", "createdAt");

CREATE OR REPLACE FUNCTION ticarti_inventory_ledger_capture()
RETURNS trigger AS $$
DECLARE
  store_id TEXT;
  movement TEXT;
  d_on_hand INTEGER;
  d_reserved INTEGER;
  d_committed INTEGER;
  d_incoming INTEGER;
  d_damaged INTEGER;
BEGIN
  SELECT "storeId" INTO store_id FROM "Warehouse" WHERE "id" = NEW."warehouseId";
  IF store_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    d_on_hand := NEW."onHand";
    d_reserved := NEW."reserved";
    d_committed := NEW."committed";
    d_incoming := NEW."incoming";
    d_damaged := NEW."damaged";
  ELSE
    d_on_hand := NEW."onHand" - OLD."onHand";
    d_reserved := NEW."reserved" - OLD."reserved";
    d_committed := NEW."committed" - OLD."committed";
    d_incoming := NEW."incoming" - OLD."incoming";
    d_damaged := NEW."damaged" - OLD."damaged";
  END IF;

  IF d_on_hand = 0 AND d_reserved = 0 AND d_committed = 0 AND d_incoming = 0 AND d_damaged = 0 THEN
    RETURN NEW;
  END IF;

  movement := CASE
    WHEN d_reserved > 0 AND d_committed = 0 AND d_on_hand = 0 THEN 'RESERVE'
    WHEN d_reserved < 0 AND d_committed > 0 AND d_on_hand = 0 THEN 'COMMIT'
    WHEN d_reserved < 0 AND d_committed = 0 AND d_on_hand = 0 THEN 'RELEASE'
    WHEN d_committed < 0 AND d_on_hand < 0 THEN 'FULFILL'
    WHEN d_committed < 0 AND d_on_hand = 0 THEN 'COMMIT_RELEASE'
    WHEN d_on_hand > 0 AND d_damaged = 0 THEN 'RECEIPT_OR_RETURN'
    WHEN d_on_hand < 0 AND d_committed = 0 THEN 'ADJUSTMENT_OUT'
    WHEN d_damaged > 0 THEN 'DAMAGE'
    WHEN d_damaged < 0 THEN 'DAMAGE_RELEASE'
    WHEN d_incoming > 0 THEN 'INCOMING_ADD'
    WHEN d_incoming < 0 THEN 'INCOMING_RELEASE'
    ELSE 'STOCK_MUTATION'
  END;

  INSERT INTO "InventoryLedgerEntry" (
    "id", "storeId", "warehouseId", "variantId", "movementType",
    "deltaOnHand", "deltaReserved", "deltaCommitted", "deltaIncoming", "deltaDamaged",
    "balanceOnHand", "balanceReserved", "balanceCommitted", "balanceIncoming", "balanceDamaged",
    "metadata", "createdAt"
  ) VALUES (
    gen_random_uuid()::text, store_id, NEW."warehouseId", NEW."variantId", movement,
    d_on_hand, d_reserved, d_committed, d_incoming, d_damaged,
    NEW."onHand", NEW."reserved", NEW."committed", NEW."incoming", NEW."damaged",
    jsonb_build_object('source','warehouse_stock_trigger','operation',TG_OP), CURRENT_TIMESTAMP
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_ticarti_inventory_ledger" ON "WarehouseStock";
CREATE TRIGGER "trg_ticarti_inventory_ledger"
AFTER INSERT OR UPDATE OF "onHand", "reserved", "committed", "incoming", "damaged"
ON "WarehouseStock"
FOR EACH ROW
EXECUTE FUNCTION ticarti_inventory_ledger_capture();
