const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const ts=require('typescript');
function load(file,dependencies={}){
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{
    fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}
  }).outputText;
  const mod=new Module(file,module);
  mod.filename=file;mod.paths=Module._nodeModulePaths(path.dirname(file));
  const original=mod.require.bind(mod);
  mod.require=id=>dependencies[id]||original(id);
  mod._compile(code,file);
  return mod.exports;
}
const blog=load(path.resolve(__dirname,'../lib/blog.ts'));
const ssr=load(path.resolve(__dirname,'../lib/homepage-ssr.ts'),{'./blog':blog});
const original=fs.readFileSync(path.resolve(__dirname,'../templates/en/index.html'),'utf8');
const blank=ssr.renderHomepageServer(original,{version:0,modules:[]},'tr',[]);
assert.ok(!blank.includes('E-ticaret siteni oluştur.<br/>14 gün ücretsiz dene.'),'Demo hero headline must never be sent without CMS');
assert.ok(!blank.includes('E-ticaret sitesi kurmadan önce bilmen gerekenler'),'Demo blog articles must never be sent without CMS');
assert.ok(!blank.includes('class="tc-site-hero is-armed"'),'Unconfigured hero must disappear');
const hero={id:'hero',enabled:true,sortOrder:0,fields:{
 heading:{tr:'Yalnızca CMS Başlığı'},description:{tr:'Gerçek açıklama'},offer:{tr:'Gerçek teklif'}
},items:[]};
const blogSection={id:'blog',enabled:true,sortOrder:1,fields:{
 heading:{tr:'Yeni İçerikler'},description:{tr:'Gerçek blog açıklaması'}
},items:[]};
const posts=[{
 id:'real-1',slug:'gercek-yazi',title:'Gerçek Blog Yazısı',excerpt:'Gerçek içerikten özet',
 category:'Haberler',featuredImage:'',imageAlt:'',content:'İçerik'
}];
const rendered=ssr.renderHomepageServer(original,{version:2,modules:[hero,blogSection]},'tr',posts);
assert.ok(rendered.includes('Yalnızca CMS Başlığı'));
assert.ok(rendered.includes('Gerçek açıklama'));
assert.ok(rendered.includes('Gerçek teklif'));
assert.ok(rendered.includes('Yeni İçerikler'));
assert.ok(rendered.includes('Gerçek blog açıklaması'));
assert.ok(rendered.includes('Gerçek Blog Yazısı'));
assert.ok(!rendered.includes('E-ticaret siteni oluştur.<br/>14 gün ücretsiz dene.'));
assert.ok(!rendered.includes('E-ticaret sitesi kurmadan önce bilmen gerekenler'));
assert.ok(!rendered.includes('tc-site-hero__carousel'),'Fake hero carousel must be absent');
assert.ok(rendered.includes('href="/blog/gercek-yazi"'));
const inactive=ssr.renderHomepageServer(original,{version:2,modules:[{...hero,enabled:false},blogSection]},'tr',posts);
assert.ok(!inactive.includes('Yalnızca CMS Başlığı'),'Disabled modules must not be rendered');
const untranslated=ssr.renderHomepageServer(original,{version:2,modules:[hero]},'de',[]);
assert.ok(!untranslated.includes('Yalnızca CMS Başlığı'),'Missing translations must never show Turkish text as demo');
const legacySource=fs.readFileSync(path.resolve(__dirname,'../lib/legacy.ts'),'utf8');
assert.ok(!legacySource.includes("data.scripts.push('/assets/js/pages/website-home-cms.js')"),
  'Client-side CMS override must not run after SSR');
const footer=ssr.renderFooterLanguages(rendered,['tr','de'],'tr',[]);
assert.ok(footer.includes('href="/de/"'));
assert.ok(footer.includes('>Deutsch<'));
assert.ok(!footer.includes('href="/en/"'),'Inactive language must not be offered');
assert.ok(!footer.includes('src="https://www.shakersworks.com/hubfs/Web%20repositioning/Icons/Languages'));
const german=ssr.renderFooterLanguages(rendered,['tr','de'],'de',['de','blog']);
assert.ok(german.includes('href="/blog"'));
assert.ok(german.includes('href="/de/blog"'));
console.log('PASS: homepage CMS SSR has no demo flash, real blog content, scoped sections and active footer locales');
