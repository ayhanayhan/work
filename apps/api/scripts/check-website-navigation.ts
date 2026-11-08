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
 assert.ok(original.groups.some(x=>x.id==='header-primary'));
 assert.ok(original.groups.some(x=>x.id==='header-resources-2'));
 assert.ok(original.groups.some(x=>x.id==='footer-4'));
 const resources=original.groups.find(x=>x.id==='header-resources-2');
 assert.ok(resources?.links.some(x=>x.url==='/araclar'));
 const edited=structuredClone(original);
 const target=edited.groups.find((x:any)=>x.id==='header-resources-2');
 target.links[0].label.en='Tools';
 target.links[0].url='/araclar';
 const updated=await service.save(edited);
 assert.equal(updated.version,1);
 assert.equal((await service.publicNavigation()).groups.find(x=>x.id==='header-resources-2')?.links[0].label.en,'Tools');
 await assert.rejects(service.save(edited),'Stale version must be rejected');
 const malicious=structuredClone(updated);
 malicious.groups.find((x:any)=>x.id==='footer-4').links[0].url='javascript:alert(1)';
 await assert.rejects(service.save(malicious),'Unsafe URLs must be rejected');
 const duplicate=structuredClone(updated);
 duplicate.groups.find((x:any)=>x.id==='footer-4').links[1].id=
  duplicate.groups.find((x:any)=>x.id==='footer-4').links[0].id;
 await assert.rejects(service.save(duplicate),'Duplicate link IDs must be rejected');
 console.log('PASS: menu defaults, Master changes, locale text, public payload, version checks and safe URLs');
}
main().catch(e=>{console.error(e);process.exitCode=1});
