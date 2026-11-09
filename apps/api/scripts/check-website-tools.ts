import 'reflect-metadata';
import assert from 'node:assert/strict';
import {WebsiteToolsService,TOOL_IDS} from '../src/website/website-tools.service';

let saved:any=null;
const prisma:any={platformSetting:{
 async findUnique(){return saved?{value:structuredClone(saved)}:null},
 async upsert({create,update}:any){saved=structuredClone(saved?update.value:create.value);return {value:saved}}
}};
async function main(){
 const svc=new WebsiteToolsService(prisma);
 const initial=await svc.snapshot();
 assert.equal(initial.version,0);
 assert.deepEqual(initial.tools.map(x=>x.id),[...TOOL_IDS]);
 assert.equal(initial.tools.length,12);
 for(const id of ['trendyol','amazon','hepsiburada','n11','ciceksepeti','pazarama']){
  const entry=initial.tools.find((x:any)=>x.id===id+'-komisyon-hesaplama');
  assert.ok(entry,'Missing marketplace tool '+id);
  assert.equal(entry?.status,'PUBLISHED');
  for(const locale of ['tr','en','de','ru','ar','bg','uk','id','vi']){
   assert.ok(entry?.fields.title[locale]);
   assert.ok(entry?.fields.seoDescription[locale], 'Missing SEO '+entry?.id+' '+locale);
  }
  assert.ok(entry?.faqs.length>=2, 'Missing FAQs '+entry?.id);
 }
 assert.equal((await svc.publicList('tr')).length,12);
 assert.equal((await svc.publicList('vi')).length,12);
 assert.equal((await svc.publicDetail('kdv-hesaplama','tr')).title,'KDV Hesaplama');
 const updated=structuredClone(initial);
 const target=updated.tools.find((x:any)=>x.id==='kdv-hesaplama');
 target.status='PUBLISHED';
 target.fields.title.tr='KDV Hesaplama';
 target.fields.title.en='VAT Calculator';
 target.fields.seoTitle.tr='KDV Hesaplama | Ticarti';
 target.sections=[{id:'intro-one',title:{tr:'KDV nasıl hesaplanır?',en:'How VAT works'},
  body:{tr:'Yasal oranları kontrol edin.'},image:''}];
 target.faqs=[{id:'faq-one',question:{tr:'KDV nedir?'},answer:{tr:'Katma değer vergisi.'}}];
 const published=await svc.save(updated);
 assert.equal(published.version,1);
 assert.equal((await svc.publicList('tr')).length,12);
 assert.equal((await svc.publicList('en')).length,12);
 assert.equal((await svc.publicList('de')).length,12);
 const page=await svc.publicDetail('kdv-hesaplama','tr');
 assert.equal(page.title,'KDV Hesaplama');
 assert.equal(page.sections.length,1);
 assert.equal(page.faqs.length,1);
 assert.equal(page.fields.seoTitle,'KDV Hesaplama | Ticarti');
 assert.equal((await svc.publicDetail('qr-kod-olusturucu','tr')).title,'QR Kod Oluşturucu');
 await assert.rejects(svc.save(updated),'Stale version must be rejected');
 const invalid=structuredClone(published);
 invalid.tools.find((x:any)=>x.id==='kdv-hesaplama').image='javascript:alert(1)';
 await assert.rejects(svc.save(invalid),'Unsafe asset URL must be rejected');
 saved={version:2,tools:initial.tools.map(x=>({...x,status:'DRAFT',
  faqs:[],sections:[],fields:{...x.fields,
   ...Object.fromEntries(Object.keys(x.fields).map(key=>[key,
    key==='title'?{tr:x.fields.title.tr}:{}]))
  }}))};
 assert.equal((await svc.snapshot()).tools.filter(x=>x.status==='PUBLISHED').length,12,'Untouched drafts migrate to published');
 saved.tools[0].fields.description={tr:'Özel içerik henüz hazır değil'};
 assert.equal((await svc.snapshot()).tools[0].status,'DRAFT','Customized drafts must remain private');
 console.log('PASS: twelve published localized SEO calculator articles with FAQs, preserved drafts and validation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
