import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
let failed=false;
const read=rel=>fs.existsSync(path.join(root,rel))?fs.readFileSync(path.join(root,rel),'utf8'):'';
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

const schema=read('apps/api/prisma/schema.prisma');
const api=read('apps/api/src/merchant/merchant.service.ts');
const dir=path.join(root,'apps/admin/app/(protected)/products/components');
const adminFiles=fs.readdirSync(dir).filter(x=>x.endsWith('.tsx')).map(x=>({name:x,text:read(`apps/admin/app/(protected)/products/components/${x}`)}));
const form=adminFiles.find(x=>x.text.includes('variants:normalizedVariants.map'))?.text||'';

ok(/model Variant \{[\s\S]*\bmodel\s+String\?/m.test(schema),'Variant.model schema field');
ok(form.includes('comparePrice:v.comparePrice'),'form sends comparePrice');
ok(form.includes('cost:v.cost'),'form sends cost');
ok(form.includes('model:v.model'),'form sends model separately from MPN');
ok(form.includes('lowStockAt:Number(v.lowStockAt??5)'),'lowStockAt zero preserved');
ok(form.includes("...(mode==='new'||!v.id?{stock:Number(v.stock||0)}:{})"),'existing variant stock not overwritten by product edit');
ok(form.includes('effectiveRequiresShipping'),'digital product disables shipping');
ok(form.includes('Karşılaştırma fiyatı satış fiyatından büyük olmalıdır.'),'price validation');
ok(form.includes('Maksimum adet minimum adetten küçük olamaz.'),'quantity validation');
ok(form.includes('GTIN 8, 12, 13 veya 14'),'GTIN validation');
ok(api.includes('private validateProductVariantInput'),'API central variant validation');

const modelPersistence =
  /mpn\s*:\s*[^,\n}]*\.mpn[^,\n}]*,\s*model\s*:\s*[^,\n}]*\.model[^,\n}]*,\s*hsCode\s*:/.test(api);
ok(modelPersistence,'API persists model');

ok(api.includes('requiresShipping:false'),'API enforces digital shipping rule');

const migration=read('apps/api/prisma/migrations/20261031003000_product_form_consolidation/migration.sql');
ok(migration.includes('ADD COLUMN IF NOT EXISTS "model" TEXT'),'model migration');

if(failed)process.exit(1);
console.log('Ticarti Fix 9 product form consolidation verification: OK');
