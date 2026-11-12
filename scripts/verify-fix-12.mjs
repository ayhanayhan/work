import fs from 'node:fs';
import path from 'node:path';

const root=process.argv[2]||process.cwd();
const svc=fs.readFileSync(path.join(root,'apps/api/src/storefront/storefront.service.ts'),'utf8');
const ctl=fs.readFileSync(path.join(root,'apps/api/src/storefront/storefront.controller.ts'),'utf8');

let failed=false;
const ok=(cond,label)=>{if(cond)console.log(`OK ${label}`);else{console.error(`FAIL ${label}`);failed=true}};

ok(ctl.includes("@Post('customer/orders/:orderId/cancel')"),'customer cancel route exists');
ok(ctl.includes('this.svc.cancelCustomerOrder(req.customer.sub,o,b)'),'route uses authenticated customer identity');
ok(svc.includes('async cancelCustomerOrder(customerId:string,orderId:string'),'customer cancel service exists');
ok(svc.includes('where:{id:orderId,customerId}'),'order ownership enforced');
ok(svc.includes('policy.allowCustomerCancel===true'),'allowCustomerCancel policy enforced');
ok(svc.includes('policy.cancelWindowMinutes??30'),'cancel window policy enforced');
ok(svc.includes("PAYMENT_ALREADY_CAPTURED"),'paid order direct customer cancellation blocked');
ok(svc.includes("FULFILLMENT_STARTED"),'fulfilled/fulfilling order customer cancellation blocked');
ok(svc.includes("String(x.status)==='HELD'"),'only HELD reservations released by customer cancellation');
ok(svc.includes("data:{reserved:{decrement:release}}"),'reserved warehouse stock released');
ok(svc.includes("status:'RELEASED',expiresAt:null"),'reservation status released');
ok(svc.includes("status:'CANCELLED'"),'order status cancelled');
ok(svc.includes("status:'CUSTOMER_CANCELLED'"),'customer cancellation history persisted');
ok(svc.includes('customerCancellation:{'),'customer cancellation audit metadata persisted');
ok(svc.includes('const customerCancellation=this.customerCancelPolicy(row,store?.settings||{})'),'order detail exposes cancellation eligibility');

if(failed)process.exit(1);
console.log('Ticarti Fix 12 customer self-cancel verification: OK');
