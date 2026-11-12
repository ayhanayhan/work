const fs=require('node:fs');const path=require('node:path');
const root=process.argv[2]||process.cwd();
const core=path.join(root,'apps/api/src/payment-providers');
const plugin=path.join(root,'apps/api/src/installed-modules/payment-stripe');
let blocked=false;
function gate(ok,msg){console.log((ok?'PASS':'BLOCK')+' '+msg);if(!ok)blocked=true;}
function read(file){return fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';}
const svc=read(path.join(plugin,'stripe-payment.service.ts'));
const controller=read(path.join(plugin,'stripe-payment.controller.ts'));
const loader=read(path.join(core,'payment-providers.module.ts'));
gate(/syncSucceeded\([\s\S]*?FOR UPDATE[\s\S]*?if\(order\.paymentStatus==='PAID'\)/.test(svc),'paid order lock before inventory commitment');
gate(/refundStripeOrder[\s\S]*?FOR UPDATE[\s\S]*?status:\{in:\['PENDING','UNKNOWN','SUCCEEDED'\]\}/.test(svc),'refund reservation serialized and held');
gate(/reconcileStripeRefund\(/.test(svc),'refund reconciliation method exists');
gate(!fs.existsSync(path.join(core,'payment-providers.controller.ts')) && /stripe\//i.test(controller),'Stripe routes removed from core');
gate(!fs.existsSync(path.join(core,'payment-providers.service.ts')) && /refundStripeOrder/.test(svc),'Stripe orchestration removed from core');
gate(/optionalInstalledStripeModule/.test(loader),'Core supports optional Stripe module');
const docker=read(path.join(root,'apps/api/Dockerfile.cloudbuild'));
gate(/COPY\s+modules\//.test(docker)||/MODULES_PATH/.test(docker),'deployment supports external provider modules');
process.exitCode=blocked?1:0;
