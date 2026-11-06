import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const root=path.resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url);
let ts;try{ts=require('typescript')}catch{throw new Error('TypeScript not installed. Run npm install first.')}
const scratch=path.join(root,'.cms-test');
fs.mkdirSync(scratch,{recursive:true});
fs.writeFileSync(path.join(scratch,'next-mock.cjs'),'module.exports={notFound(){throw Error("NEXT_NOT_FOUND")}}');

for(const name of ['blog','page-content','legacy']){
  const source=fs.readFileSync(path.join(root,'lib',name+'.ts'),'utf8');
  let compiled=ts.transpileModule(source,{compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,
    esModuleInterop:true,resolveJsonModule:true
  }}).outputText;
  compiled=compiled.replaceAll('require("./blog")','require("./blog.cjs")')
    .replaceAll('require("./page-content")','require("./page-content.cjs")')
    .replaceAll('require("next/navigation")','require("./next-mock.cjs")')
    .replaceAll('require("../public/assets/data/page-fields.json")','require('+JSON.stringify(path.join(root,'public/assets/data/page-fields.json'))+')');
  fs.writeFileSync(path.join(scratch,name+'.cjs'),compiled);
}
const {renderPage}=require(path.join(scratch,'legacy.cjs'));
const {applyPageValues}=require(path.join(scratch,'page-content.cjs'));
const previous={cwd:process.cwd(),api:process.env.API_ORIGIN,fetch:globalThis.fetch};
const post=(slug,lang)=>({
  slug,status:'PUBLISHED',title:lang==='tr'?'Türkçe yazı':'English article',
  content:lang==='tr'?'Türkçe içerik':'English content',
  excerpt:lang==='tr'?'Türkçe özet':'English excerpt',category:'Guide',
  availableLocales:[lang],featuredImage:''
});
const feeds={tr:[post('turkish-only','tr')],en:[post('english-only','en')],pt:[],ru:[]};
process.chdir(root);
process.env.API_ORIGIN='https://example.invalid';
globalThis.fetch=async url=>{
  const link=String(url);
  if(link.includes('/v1/public/website/blog')){
    const lang=new URL(link).searchParams.get('lang');
    return {ok:true,json:async()=>({version:1,posts:feeds[lang]||[]})};
  }
  return {ok:false};
};
const missing=async segments=>assert.rejects(renderPage(segments,{}),/NEXT_NOT_FOUND/);
try{
  for(const segments of [
    [],['en'],['tr'],['pt','index.html'],['paketler.html'],
    ['en','paketler.html'],['en','paketler'],
    ['en','success-stories'],['en','success-stories','crowdy.html'],
    ['en','companies','enterprise'],['en','contacto'],
    ['en','register.html'],['en','login.html'],['en','kvkk.html'],['en','uyelik-sozlesmesi.html']
  ]){
    const page=await renderPage(segments,{});
    assert.ok(page.classes.length>=8);
    assert.ok(!page.html.includes('src="../assets'));
    assert.ok(!page.html.includes('src="../../assets'));
    assert.ok(!page.html.includes('href="../assets'));
    console.log('OK /'+segments.join('/'));
  }
  const turkish=await renderPage([],{});
  assert.ok(turkish.html.includes('tc-blog__track'),'TR posts should show the homepage blog module');
  assert.ok(turkish.html.includes('turkish-only'));
  assert.ok(!turkish.html.includes('english-only'));
  const english=await renderPage(['en'],{});
  assert.ok(english.html.includes('english-only'));
  assert.ok(!english.html.includes('turkish-only'));
  const trList=await renderPage(['blog'],{});
  assert.equal(trList.isBlogList,true);
  assert.ok(trList.html.includes('turkish-only'));
  const enList=await renderPage(['en','blog'],{});
  assert.equal(enList.isBlogList,true);
  assert.ok(enList.html.includes('english-only'));
  assert.ok(!enList.html.includes('turkish-only'));
  const trPost=await renderPage(['blog','turkish-only'],{});
  const enPost=await renderPage(['en','blog','english-only'],{});
  assert.equal(trPost.post?.title,'Türkçe yazı');
  assert.equal(enPost.post?.title,'English article');
  await missing(['en','blog','turkish-only']);
  await missing(['blog','english-only']);
  await missing(['ru','blog']);
  await missing(['pt','blog']);
  await missing(['blog','e-ticaret-sitesi-kurma-rehberi']);
  feeds.tr=[];
  const noBlogHome=await renderPage([],{});
  assert.ok(!noBlogHome.html.includes('id="tc-blog"'),'No posts means no homepage blog section');
  await missing(['blog']);
  feeds.tr=[post('turkish-only','tr')];
  const schema=JSON.parse(fs.readFileSync(path.join(root,'public/assets/data/page-fields.json'),'utf8'));
  const field=schema.pages[0].fields.find(x=>x.type==='text');
  const raw=fs.readFileSync(path.join(root,'templates/en/index.html'),'utf8');
  const escaped=applyPageValues(raw,{[field.id]:'<script>NOT_EXECUTE</script>'},'home');
  assert.ok(!escaped.includes('<script>NOT_EXECUTE</script>'));
  assert.ok(escaped.includes('&lt;script&gt;NOT_EXECUTE&lt;/script&gt;'));
  console.log('PASS: locale-specific homepage, archive, article routes and HTML escaping');
}finally{
  process.chdir(previous.cwd);
  if(previous.api===undefined)delete process.env.API_ORIGIN;
  else process.env.API_ORIGIN=previous.api;
  globalThis.fetch=previous.fetch;
  fs.rmSync(scratch,{recursive:true,force:true});
}
