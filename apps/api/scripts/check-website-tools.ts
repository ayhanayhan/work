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
 assert.equal(initial.tools.length,11);
 for(const id of ['trendyol','amazon','hepsiburada','n11','ciceksepeti','pazarama']){
  const entry=initial.tools.find((x:any)=>x.id===id+'-komisyon-hesaplama');
  assert.ok(entry,'Missing marketplace tool '+id);
  assert.equal(entry?.status,'DRAFT');
 }
 assert.equal((await svc.publicList('tr')).length,0,'Draft tools cannot be indexed or visited');
 await assert.rejects(svc.publicDetail('kdv-hesaplama','tr'));
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
 assert.equal((await svc.publicList('tr')).length,1);
 assert.equal((await svc.publicList('en')).length,1);
 assert.equal((await svc.publicList('de')).length,0,'Missing translation must not silently fall back');
 const page=await svc.publicDetail('kdv-hesaplama','tr');
 assert.equal(page.title,'KDV Hesaplama');
 assert.equal(page.sections.length,1);
 assert.equal(page.faqs.length,1);
 assert.equal(page.fields.seoTitle,'KDV Hesaplama | Ticarti');
 await assert.rejects(svc.publicDetail('qr-kod-olusturucu','tr'));
 await assert.rejects(svc.save(updated),'Stale version must be rejected');
 const invalid=structuredClone(published);
 invalid.tools.find((x:any)=>x.id==='kdv-hesaplama').image='javascript:alert(1)';
 await assert.rejects(svc.save(invalid),'Unsafe asset URL must be rejected');
 console.log('PASS: tools CMS eleven independent records, drafts hidden, locale isolation, sections/FAQs/SEO, version conflicts and URL validation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
