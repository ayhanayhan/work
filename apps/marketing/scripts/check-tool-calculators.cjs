const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const assert=require('node:assert/strict');
const ts=require('typescript');
const root=path.resolve(__dirname,'..');
function load(relative){
 const file=path.join(root,relative),code=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(code,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,isolatedModules:true
 }}).outputText;
 const m=new Module(file,module);
 m.filename=file;m.paths=module.paths;
 m._compile(js,file);
 return m.exports;
}
const c=load('lib/calculators.ts');
const {qrcodegen}=load('lib/vendor/qrcodegen.ts');
const ean=load('lib/ean13.ts');
assert.equal(ean.ean13CheckDigit('400638133393'),'1');
assert.equal(ean.completeEan13('400638133393'),'4006381333931');
assert.equal(ean.completeEan13('4006381333931'),'4006381333931');
assert.equal(ean.ean13Bits('400638133393').length,95);
assert.ok(ean.ean13Bits('4006381333931').startsWith('101'));
assert.ok(ean.ean13Bits('4006381333931').endsWith('101'));
assert.match(ean.ean13Svg('4006381333931'),/4006381333931/);
assert.throws(()=>ean.completeEan13('4006381333932'));
assert.throws(()=>ean.completeEan13('40063813339a'));
assert.throws(()=>ean.completeEan13('123'));
const genSource=fs.readFileSync(path.join(root,'components/code-generator.tsx'),'utf8');
assert.ok(genSource.includes('>{t.create}</button>'),'QR and EAN-13 must have a localized Generate button');
assert.ok(genSource.includes('onSubmit={create}'),'QR and EAN-13 should generate on submit');
assert.ok(!genSource.includes('>{t[0]}</button>'),'Generator should not use the Calculate label');
const almost=(a,b,tolerance=.03)=>assert.ok(Math.abs(a-b)<=tolerance,a+' != '+b);
let r=c.vat(1000,20,false);
almost(r.net,1000);almost(r.tax,200);almost(r.gross,1200);
r=c.vat(1200,20,true);almost(r.net,1000);almost(r.tax,200);
r=c.desi(30,20,10,1,3000);almost(r.desi,2);almost(r.chargeable,2);
r=c.commission({price:1000,rate:15,rateIncludesVat:false,
 commissionVat:20,shipping:30,productCost:400,other:20,units:1});
almost(r.fee,150);almost(r.tax,30);almost(r.total,180);almost(r.remainder,370);
assert.throws(()=>c.commission({price:1000,rate:15,rateIncludesVat:false,
 commissionVat:20,shipping:30,productCost:400,other:20,units:1.5}),
 'Fractional product quantities must be rejected');
r=c.commission({price:1000,rate:18,rateIncludesVat:true,
 commissionVat:20,shipping:0,productCost:0,other:0,units:1});
almost(r.fee,150);almost(r.tax,30);almost(r.remainder,820);
r=c.commission({price:1000,shippingCollected:100,rate:10,rateIncludesVat:false,
 commissionVat:20,shipping:50,productCost:0,other:0,units:1});
almost(r.sale,1100);almost(r.fee,110);almost(r.tax,22);almost(r.remainder,918);
r=c.salary2026(33030,1);almost(r.net,28075.5);almost(r.incomeTax,0);almost(r.stamp,0);
r=c.salary2026(50000,3);
const reverse=c.salaryNetToGross(r.net,3);
almost(reverse.gross,50000,.25);
r=c.customs({price:1000,freight:0,insurance:0,exchange:1,dutyRate:10,
 extraDutyRate:0,exciseRate:0,vatRate:20,other:0});
almost(r.duty,100);almost(r.vat,220);almost(r.landed,1320);
const svgQr=qrcodegen.QrCode.encodeText('https://ticarti.com',qrcodegen.QrCode.Ecc.MEDIUM);
assert.ok(svgQr.size>=21);
assert.equal(typeof svgQr.getModule(0,0),'boolean');
for(const slug of ['trendyol','amazon','hepsiburada','n11','ciceksepeti','pazarama']){
 assert.ok(fs.readFileSync(path.join(root,'components/tool-calculator.tsx'),'utf8')
  .includes("'"+slug+"'"),slug+' missing from marketplace calculator');
}
console.log('PASS: live QR and EAN-13 with checksum, VAT, desi, marketplace commission including fee VAT, 2026 SGK/payroll net-to-gross and customs CIF');
