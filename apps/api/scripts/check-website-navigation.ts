import 'reflect-metadata';
import assert from 'node:assert/strict';
import {WebsiteNavigationService} from '../src/website/website-navigation.service';
let saved:any=null;
const service=new WebsiteNavigationService({platformSetting:{
 async findUnique(){return saved?{value:structuredClone(saved)}:null},
 async upsert({create,update}:any){saved=structuredClone(saved?update.value:create.value);return {value:saved}}
}} as any);
async function main(){
 const original=await service.get();
 assert.equal(original.version,0);
 assert.equal(original.menus.header.length,3);
 assert.equal(original.menus.footer.length,4);
 const resources=original.menus.header.find((x:any)=>x.id==='nav-resources');
 const tools=resources?.children.flatMap((group:any)=>group.children).find((item:any)=>item.url==='/araclar');
 assert.ok(tools,'Tools menu must exist');
 const marketUrls=['trendyol','amazon','hepsiburada','n11','ciceksepeti','pazarama']
  .map(m=>'/araclar/'+m+'-komisyon-hesaplama');
 assert.deepEqual(tools.children.map((item:any)=>item.url),marketUrls);
 assert.ok(tools.children.every((item:any)=>item.enabled===false),'Unpublished calculators must be hidden');

 assert.ok(resources?.children.some((c:any)=>c.children.some((n:any)=>n.url==='/araclar')));
 const originalCount=(items:any[]):number=>items.reduce((sum,x)=>sum+1+originalCount(x.children),0);
 const before=originalCount(original.menus.header)+originalCount(original.menus.footer);
 const edited=structuredClone(original);
 const parent=edited.menus.header.find((x:any)=>x.id==='nav-resources').children[1];
 const child=parent.children[1];
 child.label.en='Custom label';
 const moved=parent.children.splice(1,1)[0];
 parent.children[0].children.push(moved);
 // WordPress-style nested submenu, no link loss.
 assert.equal(originalCount(edited.menus.header)+originalCount(edited.menus.footer),before);
 const updated=await service.save({version:edited.version,menus:edited.menus});
 assert.equal(updated.version,1);
 assert.equal((await service.get()).menus.header[2].children[1].children[0].children.length,7);
 assert.equal(updated.menus.header[2].children[1].children[0].children[6].label.en,'Custom label');
 assert.equal((await service.publicNavigation()).menus.header[2].children[1].children[0].children[6].url,child.url);
 await assert.rejects(service.save({version:0,menus:edited.menus}),'Stale version must be rejected');
 const unsafe=structuredClone(updated.menus);
 unsafe.footer[0].children[0].url='javascript:alert(1)';
 await assert.rejects(service.save({version:1,menus:unsafe}),'Unsafe URL must be rejected');
 const dup=structuredClone(updated.menus);
 dup.footer[0].children[1].id=dup.footer[0].children[0].id;
 await assert.rejects(service.save({version:1,menus:dup}),'Duplicate ID must be rejected');
 const deep=structuredClone(updated.menus);
 deep.header[0].children[0].children[0].children.push({
  id:'too-deep',label:{tr:'Derin'},url:'/deep',enabled:true,children:[{id:'level-five',label:{tr:'Beşinci'},url:'/five',enabled:true,children:[]}]});
 await assert.rejects(service.save({version:1,menus:deep}),'Max nesting must be enforced');
 const custom=structuredClone(updated.menus);
 const toolsAfter=custom.header.find((x:any)=>x.id==='nav-resources').children[1].children[0];
 const deletedId=toolsAfter.children[0].id;
 toolsAfter.children=toolsAfter.children.filter((x:any)=>x.id!==deletedId);
 const customized=await service.save({version:1,menus:custom});
 assert.equal(customized.version,2);
 const reopened=await service.get();
 assert.equal(reopened.menus.header[2].children[1].children[0].children.some((x:any)=>x.id===deletedId),false,
  'Manual deletion must not be reinserted by migration on next read');
 console.log('PASS: independent marketplace links, legacy preservation, user deletions, locales, safe URLs and nested menu validation');
}
main().catch(e=>{console.error(e);process.exitCode=1});
