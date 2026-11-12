ALTER TABLE "CheckoutConfig"
ADD COLUMN IF NOT EXISTS "reservationMinutes" INTEGER NOT NULL DEFAULT 30;

UPDATE "CheckoutConfig"
SET "reservationMinutes" = LEAST(1440, GREATEST(1, COALESCE("reservationMinutes", 30)));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "CheckoutConfig"
    WHERE "reservationMinutes" < 1 OR "reservationMinutes" > 1440
  ) THEN
    RAISE EXCEPTION 'CheckoutConfig.reservationMinutes outside allowed range';
  END IF;
END $$;
