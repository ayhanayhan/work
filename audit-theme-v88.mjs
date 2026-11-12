#!/usr/bin/env node
/** Read-only, theme-independent template audit. Run at repository root. */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require=createRequire(resolve(process.cwd(),'package.json'));
let PrismaClient;
try { ({ PrismaClient }=require('@prisma/client')); } catch(e) { console.error('Prisma client not found. Run from repository root.'); process.exit(2); }
const slug=process.argv[2]||'main';
const key=process.argv[3]||'product';
if(!/^[a-z0-9-]{1,100}$/i.test(slug)||!/^[a-z0-9_.-]{1,100}$/i.test(key))throw Error('Invalid argument');
const prisma=new PrismaClient();
const object=(v)=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
function describe(template){
 const tpl=object(template),sections=object(tpl.sections);
 return {section_order:Array.isArray(tpl.order)?tpl.order:null,sections:Object.fromEntries(Object.entries(sections).map(([sid,raw])=>{
  const row=object(raw),blocks=object(row.blocks),order=Array.isArray(row.block_order)?row.block_order:null;
  return [sid,{type:row.type||null,setting_keys:Object.keys(object(row.settings)).sort(),block_order:order,block_count:Object.keys(blocks).length,blocks_outside_order:order?Object.keys(blocks).filter(id=>!order.includes(id)):null,blocks:Object.fromEntries(Object.entries(blocks).map(([id,b])=>[id,{type:b?.type||null,disabled:b?.disabled===true,in_order:order?order.includes(id):null}]))}];
 }))};
}
function diff(base,saved){
 const a=object(base?.sections),b=object(saved?.sections),ids=new Set([...Object.keys(a),...Object.keys(b)]);
 return Object.fromEntries([...ids].map(id=>{
  const x=a[id],y=b[id],o1=x?.block_order,o2=y?.block_order;
  return [id,{saved_section_present:!!y,package_order:Array.isArray(o1)?o1:null,saved_order:Array.isArray(o2)?o2:null,saved_order_differs:Array.isArray(o2)?JSON.stringify(o1)!==JSON.stringify(o2):false,saved_has_explicit_blocks:Object.prototype.hasOwnProperty.call(object(y),'blocks'),saved_has_explicit_settings:Object.prototype.hasOwnProperty.call(object(y),'settings')}];
 }));
}
try {
 const store=await prisma.tenant.findFirst({where:{OR:[{publicSlug:slug},{slug},{domain:slug}]},select:{id:true,slug:true,publicSlug:true,activeTheme:true,settings:true}});
 if(!store)throw Error('Tenant not found');
 const state=object(object(store.settings).themeState);
 const theme=await prisma.themeDefinition.findFirst({where:{slug:store.activeTheme},select:{id:true,slug:true,version:true,config:true}});
 if(!theme)throw Error('Active theme not found');
 const config=object(theme.config);
 const pkg=object(object(config.pages)[key]);
 const saved=object(object(object(state.runtime).templates)[key]);
 const stateMatches=String(state.themeId||'')===String(theme.id);
 const report={tenant:store.publicSlug||store.slug,theme:{slug:theme.slug,version:theme.version},template:key,state_matches_active_theme:stateMatches,package:describe(pkg),saved:describe(saved),difference:diff(pkg,stateMatches?saved:{}),caution:'Read-only comparison; saved values are not modified; package config must be confirmed as published version.'};
 const filename=`ticarti-theme-audit-${slug}-${key}.json`;
 writeFileSync(filename,JSON.stringify(report,null,2));
 console.log(`Report saved: ${filename}`);
 console.log('Saved config belongs to active theme:',stateMatches);
 for(const [sid,r] of Object.entries(report.difference)) console.log(`Section ${sid}: savedOrder=${r.saved_order?.length??'ABSENT'}, packageOrder=${r.package_order?.length??'ABSENT'}, differs=${r.saved_order_differs}`);
} catch(e){console.error('AUDIT FAILED:',e?.message||e);process.exitCode=1} finally {await prisma.$disconnect()}
