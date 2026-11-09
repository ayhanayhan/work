const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const middleware=fs.readFileSync(path.join(root,'middleware.ts'),'utf8');
const proxy=fs.readFileSync(path.join(root,'app/ticarti-marketing-proxy/[[...path]]/route.ts'),'utf8');
assert.match(middleware,/\x27\/iletisim\x27/,'Public contact route must be routed to Marketing');
assert.ok(middleware.includes('return proxyMarketing(req);'),'Unknown corporate URLs must reach Marketing');
assert.ok(!middleware.includes('/\\.[a-z0-9]{2,6}\\$/i.test(path)'),
  'Unknown .html paths must not bypass branded Marketing 404');
assert.ok(proxy.includes("publicPath==='/iletisim'"),'Proxy must map Turkish contact URL');
assert.ok(proxy.includes("localized?'/'+localized[1]+'/contact':publicPath"),
  'Localized contact links must map to native Next.js routes');
const upstream=(route)=>{
 const localized=route.match(/^\/(en|de|ru|ar|bg|uk|id|vi)\/iletisim\/?$/);
 return route==='/iletisim'||route==='/iletisim/'?'/contact':localized?'/'+localized[1]+'/contact':route;
};
assert.equal(upstream('/iletisim'),'/contact');
assert.equal(upstream('/en/iletisim'),'/en/contact');
assert.equal(upstream('/araclar/kdv-hesaplama'),'/araclar/kdv-hesaplama');
assert.equal(upstream('/olmayan-bir-sayfa.html'),'/olmayan-bir-sayfa.html');
console.log('PASS: public contact rewrites and unknown-page routing use Marketing');
