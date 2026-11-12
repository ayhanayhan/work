import fs from 'node:fs';
import path from 'node:path';
const root=process.argv[2]||process.cwd();
let failed=false;
function check(rel,re,label){
  const p=path.join(root,rel);
  const t=fs.existsSync(p)?fs.readFileSync(p,'utf8'):'';
  if(!re.test(t)){console.error(`FAIL ${label}: ${rel}`);failed=true}else console.log(`OK ${label}`);
}
check('apps/api/prisma/schema.prisma',/model B2BQuoteRequest \{/,'B2B quote model');
check('apps/api/src/storefront/storefront.service.ts',/b2BQuoteRequest\.create/,'storefront writes quote domain');
check('apps/api/src/merchant/merchant.module.ts',/B2BQuoteController/,'B2B quote controller registered');
check('apps/api/src/merchant/b2b-quote.service.ts',/b2BQuoteRequest\.findMany/,'B2B quote admin service');
check('apps/admin/app/(protected)/settings/b2b/quotes/page.tsx',/B2B Teklif Talepleri/,'B2B quote admin page');
check('apps/admin/app/(protected)/settings/components/settings-page.tsx',/href="\/settings\/b2b\/quotes"/,'B2B settings quote link');
check('apps/admin/app/(protected)/settings/advanced-commerce/page.tsx',/Ham ID\/JSON yönetimi kaldırıldı/,'advanced commerce raw CRUD removed');
const adv=fs.readFileSync(path.join(root,'apps/admin/app/(protected)/settings/advanced-commerce/page.tsx'),'utf8');
if(/JSON\.parse|kind:'json'|admin\/advanced-commerce\/\$\{/.test(adv)){console.error('FAIL raw advanced commerce CRUD still present');failed=true}else console.log('OK no raw advanced commerce CRUD');
if(failed)process.exit(1);
console.log('Ticarti Fix 8B verification: OK');
