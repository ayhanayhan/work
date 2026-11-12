DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Membership"
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'single-store migration blocked: duplicate Membership.userId rows exist; run scripts/single-store-cleanup.mjs first';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Membership_userId_key"
ON "Membership"("userId");
