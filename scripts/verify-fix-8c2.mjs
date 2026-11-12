import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
let failed=false;

function read(rel){
  const p=path.join(root,rel);
  return fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
}
function ok(cond,label){
  if(cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed=true; }
}

const schema=read('apps/api/prisma/schema.prisma');
const merchant=read('apps/api/src/merchant/merchant.service.ts');
const manager=read('apps/admin/app/(protected)/products/components/catalog-definition-manager.tsx');
const migration=read('apps/api/prisma/migrations/20261030233000_product_group_google_category_cleanup/migration.sql');

ok(!/model ProductGroup \{/.test(schema),'ProductGroup model removed');
ok(!/model ProductGroupItem \{/.test(schema),'ProductGroupItem model removed');

const product=schema.match(/model Product \{([\s\S]*?)\n\}/);
ok(!!product && !/googleProductCategory\s+String\?/.test(product[1]),'Product legacy google category removed');
ok(/model Category \{[\s\S]*googleProductCategory\s+String\?/m.test(schema),'Category google category preserved');
ok(!/groups\s+ProductGroupItem\[\]/.test(schema),'Product groups relation removed');
ok(!/productGroups\s+ProductGroup\[\]/.test(schema),'Tenant productGroups relation removed');

ok(!/prisma\.productGroup/.test(merchant),'ProductGroup Prisma CRUD removed');
ok(!/prisma\.productGroupItem/.test(merchant),'ProductGroupItem synchronization removed');
ok(!/groupIds/.test(merchant),'groupIds product write removed');
ok(!/productGroups:productGroups/.test(merchant),'productGroups catalog payload removed');
ok(!/product-groups/.test(merchant),'product-groups catalog kind removed');

ok(!/'product-groups'\s*:/.test(manager),'Product Groups admin definition removed');
ok(!fs.existsSync(path.join(root,'apps/admin/app/(protected)/products/definitions/groups')),'Product Groups route removed');

ok(/group_count <> 0 OR item_count <> 0/.test(migration),'migration ProductGroup guard present');
ok(/legacy_google_count <> 0/.test(migration),'migration Product google category guard present');
ok(/DROP TABLE IF EXISTS "ProductGroup"/.test(migration),'migration drops ProductGroup');
ok(/DROP COLUMN IF EXISTS "googleProductCategory"/.test(migration),'migration drops legacy Product column');

if(failed) process.exit(1);
console.log('Ticarti Fix 8C2 product domain cleanup verification: OK');
