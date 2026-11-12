DO $$
DECLARE
  group_count BIGINT;
  item_count BIGINT;
  legacy_google_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO group_count FROM "ProductGroup";
  SELECT COUNT(*) INTO item_count FROM "ProductGroupItem";
  SELECT COUNT(*) INTO legacy_google_count
  FROM "Product"
  WHERE "googleProductCategory" IS NOT NULL;

  IF group_count <> 0 OR item_count <> 0 THEN
    RAISE EXCEPTION
      'product domain cleanup blocked: ProductGroup=% ProductGroupItem=%',
      group_count, item_count;
  END IF;

  IF legacy_google_count <> 0 THEN
    RAISE EXCEPTION
      'product domain cleanup blocked: Product.googleProductCategory has % non-null rows',
      legacy_google_count;
  END IF;
END $$;

DROP TABLE IF EXISTS "ProductGroupItem";
DROP TABLE IF EXISTS "ProductGroup";

ALTER TABLE "Product"
DROP COLUMN IF EXISTS "googleProductCategory";
