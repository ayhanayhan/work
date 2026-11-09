const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const middleware=fs.readFileSync(path.join(root,'middleware.ts'),'utf8');
const proxy=fs.readFileSync(path.join(root,'app/ticarti-marketing-proxy/[[...path]]/route.ts'),'utf8');
assert.match(middleware,/\x27\/iletisim\x27/,'Public contact route must be routed to Marketing');
assert.ok(middleware.includes('return proxyMarketing(req);'),'Unknown corporate URLs must reach Marketing');
assert.ok(!middleware.includes('2,6}$/i.test(path)'),
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
const login=fs.readFileSync(path.join(root,'app/ticarti-login/page.tsx'),'utf8');
const sessionStatus=fs.readFileSync(path.join(root,'app/ticarti-login/session-status/route.ts'),'utf8');
assert.ok(middleware.includes("'/yardim'"),'Help Center must route to Marketing');
assert.ok(login.includes("intent==='support'&&!returnTo?'/support'"),
  'Support login must hand off to tenant support, not a new ticket system');
assert.ok(sessionStatus.includes("API+'/v1/merchant-auth/session'") &&
  sessionStatus.includes("'user-agent':req.headers.get('user-agent')"),
  'Header session read must verify existing merchant authentication with browser binding');
assert.ok(sessionStatus.includes('Access-Control-Allow-Credentials') &&
  sessionStatus.includes('authenticated:Array.isArray(data?.memberships)'),
  'Public site may receive only validated merchant auth state without tokens');
assert.ok(sessionStatus.includes("'https://help.ticarti.com'"),
 'Help subdomain must be allowed to read merchant session state without exposing tokens');
const appPage=fs.readFileSync(path.join(root,'app/ticarti-app/page.tsx'),'utf8');
assert.ok(appPage.includes('NEXT_PUBLIC_TICARTI_APP_LOGO') &&
 appPage.includes('<AppLogo/>') && appPage.includes('onError={()=>setFailed(true)}'),
 'App subdomain should allow an independent logo with original wordmark fallback');
console.log('PASS: Help Center routing, authenticated merchant support handoff and read-only session status');
console.log('PASS: public contact rewrites and unknown-page routing use Marketing');
