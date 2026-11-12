/* Shared Theme Editor model: one source of truth for schema, defaults and section state. */
export type Area='header'|'template'|'footer'|'settings';
export type Selection={area:Area,id?:string}|null;
export const arr=(v:any)=>Array.isArray(v)?v:[];
export const obj=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
export const clone=<T,>(v:T):T=>{try{return structuredClone(v)}catch{return JSON.parse(JSON.stringify(v??null)) as T}};
export const uid=(prefix='section')=>`${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`;
export const label=(v:any,fallback='')=>{const s=String(v||fallback||'');return s.startsWith('t:')?fallback||s.split('.').pop()||s:s};
export const schemaSettings=(schema:any)=>arr(schema?.settings);
export const defaults=(schema:any)=>Object.fromEntries(schemaSettings(schema).filter((x:any)=>x?.id&&x?.default!==undefined).map((x:any)=>[String(x.id),clone(x.default)]));
export const blockDefaults=(schema:any)=>defaults(schema);
export const sectionMap=(state:any)=>obj(state?.sections);
export const sectionOrder=(state:any)=>arr(state?.order).map(String);

export const schemaKey=(v:any)=>String(v||'').trim().toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
export const schemaText=(t:any,v:any,fallback='')=>{const raw=label(v,fallback);if(!raw)return raw;return String(t(`themeEditor.schema.${schemaKey(raw)}`,{defaultValue:raw}))};
export const hiddenThemeGroup=(g:any)=>{const n=schemaKey(g?.name);return n==='purchase_code'||n==='theme_info'};
export const hiddenThemeSetting=(row:any)=>['license','supportcode'].includes(String(row?.id||'').toLowerCase());
const styleWords=/color|background|border|shadow|font|typograph|size|width|height|spacing|padding|margin|radius|align|position|layout|style|gradient|opacity|animation|sticky|columns?|desktop|mobile|hover|icon|shape/i;
const contentWords=/content|text|title|heading|subheading|description|image|media|video|url|link|menu|collection|product|blog|article|page|logo|label|button text|placeholder/i;
const contentTypes=new Set(['text','textarea','richtext','inline_richtext','html','image_picker','video','video_url','url','link_list','product','collection','blog','article','page']);
const styleTypes=new Set(['color','color_background','font_picker','range']);
export type SettingsTab='content'|'style'|'settings';
export type ThemeFieldResources={siteLogoUrl?:string;socialAccounts?:{platform:string;url:string}[];openMedia?:(cb:(url:string)=>void,title?:string)=>void};
export const logoSetting=(row:any)=>String(row?.type||'')==='image_picker'&&/(^|_)logo($|_)/i.test(String(row?.id||''));
export const socialSetting=(row:any)=>/^social_media_\d+$/i.test(String(row?.id||''));

function settingBucket(row:any,groupTitle=''):SettingsTab{
  const type=String(row?.type||'');
  const hay=`${groupTitle} ${row?.id||''} ${row?.label||''} ${row?.content||''}`;
  if(styleTypes.has(type)||styleWords.test(hay))return'style';
  if(contentTypes.has(type)||contentWords.test(hay))return'content';
  return'settings';
}
export function settingGroups(rows:any[],t:any){
  const out:{title:string;rows:any[];bucket:SettingsTab}[]=[];let current:{title:string;rows:any[]}={title:String(t('themeEditor.groups.general',{defaultValue:'General'})),rows:[]};
  const push=()=>{const clean=current.rows.filter((x:any)=>!hiddenThemeSetting(x));if(!clean.length)return;const counts:{[k:string]:number}={content:0,style:0,settings:0};for(const row of clean)counts[settingBucket(row,current.title)]++;const bucket=(Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||'settings') as SettingsTab;out.push({title:current.title,rows:clean,bucket});};
  for(const row of arr(rows)){if(String(row?.type)==='header'){push();current={title:schemaText(t,row?.content,row?.label||String(t('themeEditor.groups.general',{defaultValue:'General'}))),rows:[]};}else current.rows.push(row)}
  push();return out;
}


/** Stable section/block ordering and duplication contract shared by the editor UI. */
export function reorderId(order:string[],id:string,delta:number):string[]{
  const next=[...order];const from=next.indexOf(id);if(from<0)return next;
  const to=Math.min(next.length-1,Math.max(0,from+delta));
  if(to!==from)next.splice(to,0,next.splice(from,1)[0]);
  return next;
}
export function duplicateSectionState(state:any,id:string,newId:string,newBlockId:()=>string){
  const sections={...sectionMap(state)},original=sections[id];
  if(!original||sections[newId])return state;
  const copy=clone(original),blocks=obj(copy.blocks),mapped:any={},block_order:string[]=[];
  for(const oldId of arr(copy.block_order).map(String)){
    if(!Object.prototype.hasOwnProperty.call(blocks,oldId))continue;
    const bid=newBlockId();mapped[bid]=clone(blocks[oldId]);block_order.push(bid);
  }
  copy.blocks=mapped;copy.block_order=block_order;
  const order=sectionOrder(state);const index=order.indexOf(id);
  order.splice(index<0?order.length:index+1,0,newId);
  sections[newId]=copy;
  return {...state,sections,order};
}
