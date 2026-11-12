import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
let failed=false;
function check(rel,re,label){
  const p=path.join(root,rel);
  const t=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
  if(!re.test(t)){console.error(`FAIL ${label}: ${rel}`);failed=true}
  else console.log(`OK ${label}`);
}
check('apps/api/prisma/schema.prisma',/reservationMinutes\s+Int\s+@default\(30\)/,'CheckoutConfig reservation source');
check('apps/api/src/merchant/merchant.service.ts',/checkoutConfig\.upsert\(\{where:\{storeId\}.*reservationMinutes/s,'settings -> CheckoutConfig sync');
check('apps/api/src/merchant/merchant.service.ts',/productDefaults.*productStockPolicy/s,'product defaults consumed');
check('apps/api/src/merchant/merchant.service.ts',/status:body\.status\|\|defaultProductStatus/,'new product status default');
check('apps/api/src/merchant/merchant.service.ts',/defaultLowStockAt/,'new inventory defaults');
check('apps/api/src/storefront/storefront.service.ts',/returnWindowStart=deliveredTimes\.length\?Math\.max/,'return window uses delivery time');
check('apps/api/src/merchant/advanced-commerce.service.ts',/salesChannelId:channel\?\.id\|\|null/,'draft order keeps sales channel');
check('apps/api/src/merchant/advanced-commerce.service.ts',/reservationMinutes\*60\*1000/,'draft reservation configurable');
check('apps/admin/app/(protected)/settings/components/settings-page.tsx',/function Security\(\{p:_p,setP:_setP/,'fake security toggles removed');
const apiSrc=path.join(root,'apps/api/src');
function walk(d){if(!fs.existsSync(d))return[];return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)])}
const leftovers=walk(apiSrc).filter(p=>/\.backup|\.pre-|\.bak$/.test(path.basename(p)));
if(leftovers.length){console.error('FAIL source backup files remain');leftovers.forEach(x=>console.error(' - '+path.relative(root,x)));failed=true}else console.log('OK source backup files removed');
if(failed)process.exit(1);
console.log('Ticarti Fix 8 core commerce consolidation verification: OK');
