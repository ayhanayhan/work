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
 assert.ok(resources?.children.some((c:any)=>c.children.some((n:any)=>n.url==='/araclar')));
 const originalCount=(items:any[]):number=>items.reduce((sum,x)=>sum+1+originalCount(x.children),0);
 const before=originalCount(original.menus.header)+originalCount(original.menus.footer);
 const edited=structuredClone(original);
 const parent=edited.menus.header.find((x:any)=>x.id==='nav-resources').children[1];
 const child=parent.children[0];
 child.label.en='Custom label';
 const moved=parent.children.splice(0,1)[0];
 parent.children[0].children.push(moved);
 // WordPress-style nested submenu, no link loss.
 assert.equal(originalCount(edited.menus.header)+originalCount(edited.menus.footer),before);
 const updated=await service.save({version:edited.version,menus:edited.menus});
 assert.equal(updated.version,1);
 assert.equal(updated.menus.header[2].children[1].children[0].children[0].label.en,'Custom label');
 assert.equal((await service.publicNavigation()).menus.header[2].children[1].children[0].children[0].url,child.url);
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
 console.log('PASS: WordPress-style nested navigation, legacy migration, no link loss, locales, safe URLs, duplicate protection and version checks');
}
main().catch(e=>{console.error(e);process.exitCode=1});
