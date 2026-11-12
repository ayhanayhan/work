import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const t=fs.readFileSync(path.join(root,'apps/api/src/merchant/merchant.service.ts'),'utf8');

let failed=false;
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

const start=t.indexOf('  async editOrderItems(');
const end=t.indexOf('  async settleOrderEditAdjustment(',start);
const body=start>=0&&end>start?t.slice(start,end):'';

ok(t.includes('private async calculateOrderTaxBreakdown('),'central order tax calculator exists');
ok(body.includes("taxCategory:{include:{rules:{orderBy:{priority:'asc'}}}}"),'order edit loads TaxCategory rules');
ok(t.includes('taxPolicy.destinationBased!==false'),'destination based tax supported');
ok(t.includes('customerMeta.taxExempt===true'),'tax exemption supported');
ok(t.includes('taxPolicy.pricesIncludeTax??regional.pricesIncludeTax??settings.pricesIncludeTax'),'inclusive/exclusive tax supported');
ok(body.includes('calculateOrderTaxBreakdown(tx,storeId,rows'),'order edit uses central tax calculator');
ok(body.includes('taxRate:lineTax.taxRate,taxAmount:lineTax.taxAmount'),'line tax breakdown persisted');
ok(body.includes('const {subtotal,discountTotal,taxTotal,grandTotal}=financials;'),'order totals use central result');
ok(!body.includes('const taxRate=Math.max(0,Number(regional.defaultRate'),'legacy single-rate tax removed');
ok(body.includes('discountTotal:Number(order.discountTotal||0)'),'existing order discount preserved');
ok(!body.includes('evaluatePromotions('),'current promotions not reapplied');
ok(body.includes("metadata:{source:'order_edit'}"),'reservation rebuild preserved');
ok(body.includes('orderEditAdjustment:adjustment'),'financial adjustment preserved');
ok(body.includes('orderEditTax:'),'tax recalculation audit metadata persisted');

if(failed)process.exit(1);
console.log('Ticarti Fix 11 order edit central tax recalculation verification: OK');
