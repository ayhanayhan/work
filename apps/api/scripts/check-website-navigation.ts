import 'reflect-metadata';
import assert from 'node:assert/strict';
import {WebsiteNavigationService} from '../src/website/website-navigation.service';
let navigation:any=null;
let tools:any={tools:[]};
const service=new WebsiteNavigationService({platformSetting:{
 async findUnique({where}:any){
  const value=where.key==='marketing_tools_pages_v1'?tools:navigation;
  return value?{value:structuredClone(value)}:null;
 },
 async upsert({create,update}:any){
  navigation=structuredClone(navigation?update.value:create.value);
  return {value:navigation};
 }
}} as any);
const all=(rows:any[]):any[]=>rows.flatMap(row=>[row,...all(row.children||[])]);
const published=(rows:any[],url:string)=>all(rows).find(row=>row.url===url);
async function main(){
 const initial=await service.get();
 const locales=['tr','en','de','ru','ar','bg','uk','id','vi'];
 assert.equal(initial.version,0);
 assert.equal(initial.menus.header.length,3);
 assert.equal(initial.menus.footer.length,4);
 assert.ok(!all(initial.menus.header).some(row=>row.url==='/araclar'),
  'Header must not link to retired Tools listing');
 assert.ok(!all(initial.menus.footer).some(row=>row.url==='/araclar'),
  'Footer must not link to retired Tools listing');
 const footer=initial.menus.footer.find((row:any)=>row.id==='footer-4');
 const paths=['qr-kod-olusturucu','kdv-hesaplama',
  'trendyol-komisyon-hesaplama','amazon-komisyon-hesaplama',
  'hepsiburada-komisyon-hesaplama','n11-komisyon-hesaplama',
  'ciceksepeti-komisyon-hesaplama','pazarama-komisyon-hesaplama',
  'maas-hesaplama','gumruk-vergisi-hesaplama','desi-hesaplama']
  .map(slug=>'/araclar/'+slug);
 assert.deepEqual(footer.children.filter((row:any)=>paths.includes(row.url)).map((row:any)=>row.url),paths);
 assert.ok(footer.children.every((row:any)=>row.children.length===0),
  'All calculators must be separate direct footer links');
 for(const node of [...all(initial.menus.header),...all(initial.menus.footer)]){
  for(const locale of locales)assert.ok(node.label[locale],node.id+' is missing '+locale);
 }
 const starter=await service.publicNavigation('tr');
 assert.ok(paths.every(url=>published(starter.menus.footer,url)?.enabled===true),
  'All eleven published starter pages must appear in Footer');
 const vietnamese=await service.publicNavigation('vi');
 assert.ok(paths.every(url=>published(vietnamese.menus.footer,url)?.enabled===true),
  'Footer must show translated starter pages in all nine languages');
 tools={tools:[{id:'kdv-hesaplama',status:'PUBLISHED',fields:{
  title:{tr:'KDV Hesaplama',en:'VAT Calculator'}}}]};
 const turkish=await service.publicNavigation('tr');
 assert.equal(published(turkish.menus.footer,'/araclar/kdv-hesaplama')?.enabled,true);
 assert.equal(published(turkish.menus.footer,'/araclar/qr-kod-olusturucu')?.enabled,false);
 assert.equal(published((await service.publicNavigation('de')).menus.footer,
  '/araclar/kdv-hesaplama')?.enabled,false,'Missing translation must hide tool');

 const changed=structuredClone(initial.menus);
 changed.footer[3].children.find((row:any)=>row.url==='/araclar/kdv-hesaplama').label.en='VAT Tool';
 const next=await service.save({version:0,menus:changed});
 assert.equal(next.version,1);
 assert.equal(published((await service.get()).menus.footer,'/araclar/kdv-hesaplama')?.label.en,'VAT Tool');
 await assert.rejects(service.save({version:0,menus:changed}));
 const unsafe=structuredClone(next.menus);
 unsafe.footer[0].children[0].url='javascript:alert(1)';
 await assert.rejects(service.save({version:1,menus:unsafe}));
 const duplicate=structuredClone(next.menus);
 duplicate.footer[0].children[1].id=duplicate.footer[0].children[0].id;
 await assert.rejects(service.save({version:1,menus:duplicate}));
 const deep=structuredClone(next.menus);
 deep.header[0].children[0].children[0].children.push({id:'deep-4',
  label:{tr:'Deep'},url:'/deep',enabled:true,children:[
   {id:'deep-5',label:{tr:'Too deep'},url:'/deeper',enabled:true,children:[]}]});
 await assert.rejects(service.save({version:1,menus:deep}));
 const removed=structuredClone(next.menus);
 removed.footer[3].children=removed.footer[3].children.filter(
  (row:any)=>row.url!=='/araclar/n11-komisyon-hesaplama');
 const saved=await service.save({version:1,menus:removed});
 assert.equal(saved.version,2);
 assert.ok(!published((await service.get()).menus.footer,'/araclar/n11-komisyon-hesaplama'),
  'Deleted link must not be recreated after migration');
 const blank=structuredClone(saved.menus);
 blank.footer[3].label.vi='';
 await service.save({version:2,menus:blank});
 assert.equal((await service.get()).menus.footer[3].label.vi,'',
  'Intentional blank translation must not be refilled');
 // Existing saved WP-style menus are migrated without losing unrelated links.
 navigation={version:4,groups:initial.groups,menus:{
  header:structuredClone(initial.menus.header),
  footer:structuredClone(initial.menus.footer)
 }};
 navigation.menus.header[0].children[0].children.push({
  id:'custom-heading',label:{tr:'Özel'},url:'/custom',enabled:true,children:[]});
 // Previous release had the calculator nested below /araclar in Header.
 navigation.menus.header[2].children[1].children.push({
  id:'legacy-archive-header',label:{tr:'Ücretsiz araçlar'},url:'/araclar',
  enabled:true,children:[{id:'tool-kdv-hesaplama',label:{tr:'Özel KDV',en:'Custom VAT'},
   url:'/araclar/kdv-hesaplama',enabled:false,children:[]}]
 });
 navigation.menus.footer[3].children=navigation.menus.footer[3].children.filter(
  (row:any)=>row.url!=='/araclar/kdv-hesaplama');
 navigation.menus.footer[3].children.unshift({
  id:'legacy-archive',label:{tr:'Ücretsiz araçlar'},url:'/araclar',enabled:true,children:[]});
 delete navigation.toolsFooterMigration;
 const converted=await service.get();
 assert.ok(published(converted.menus.header,'/custom'));
 assert.ok(!published(converted.menus.footer,'/araclar'));
 assert.equal(converted.menus.footer[3].children.filter((row:any)=>paths.includes(row.url)).length,11);
 assert.equal(published(converted.menus.footer,'/araclar/kdv-hesaplama')?.label.en,'Custom VAT',
  'Custom labels from previous Header tree must be preserved in Footer');
 await service.save({version:4,menus:converted.menus});
 assert.ok(!published((await service.get()).menus.footer,'/araclar'));
 console.log('PASS: eleven footer tools, no archive link, locale publication, migration, edits, deletes and hierarchy');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
