import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]||'.');
const sf=fs.readFileSync(path.join(root,'apps/api/src/storefront/storefront.service.ts'),'utf8');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const deploy=fs.readFileSync(path.join(root,'deploy-final.sh'),'utf8');
const checks=[
 ['B2B terms payment detection',/isB2BTermsPayment\(method:any\)/],
 ['buyer company is store scoped',/b2BBuyer\.findFirst\(\{where:\{customerId,company:\{storeId,status:'ACTIVE'\}\}/],
 ['company currency enforced',/CURRENCY_MISMATCH/],
 ['company location ownership enforced',/LOCATION_INVALID/],
 ['location terms override supported',/location\?\.paymentTermsDays\?\?company\.paymentTermsDays/],
 ['open balance only counts B2B term amount',/b2bTerms\?\.amount\|\|0/],
 ['credit limit eligibility enforced',/openBalance\+requested<=creditLimit/],
 ['ineligible terms hidden at checkout',/this\.isB2BTermsPayment\(x\)&&!b2bTermsContext\.eligible/],
 ['checkout revalidates B2B credit in transaction',/b2bTerms=await this\.b2bPaymentContext\(tx,/],
 ['fully prepaid order cannot use terms',/B2B payment terms are not required for a fully prepaid order/],
 ['B2B order stores due date',/dueAt:new Date\(Date\.now\(\)\+b2bTerms\.termsDays\*86400000\)/],
 ['B2B order stores open balance snapshot',/openBalanceBefore:b2bTerms\.openBalance/],
 ['B2B terms amount stores only unpaid payable',/amount:Number\(tenderPreview\.payable\|\|0\)/],
 ['B2B terms checkout is Serializable',/isolationLevel:'Serializable'/],
 ['B2B terms order does not require external provider',/payment\.type==='cod'\|\|this\.isB2BTermsPayment\(payment\)/],
];
let bad=0; for(const [name,re] of checks){if(re.test(sf)) console.log('OK',name); else {console.error('FAIL',name);bad++;}}
if(pkg.scripts?.['verify:b2b-credit']!=='node scripts/b2b-credit-v30_6-check.mjs'){console.error('FAIL root verifier script wired');bad++;} else console.log('OK root verifier script wired');
for(const f of ['production-migration-v30-check.mjs','api-image-v30_1-check.mjs','production-concurrency-v30_2-check.mjs','payment-webhook-v30_3-check.mjs','tenant-isolation-v30_4-check.mjs','shipping-rates-v30_5-check.mjs','b2b-credit-v30_6-check.mjs']){
 if(!deploy.includes(f)){console.error('FAIL deploy verifier missing',f);bad++;}
}
if(!bad)console.log('Ticarti v30.6 B2B credit + payment terms verification: OK');
process.exit(bad?1:0);
