import { BadRequestException } from '@nestjs/common';
import { inflateRawSync } from 'zlib';
import { apiError } from '../i18n/api-error';

export type ParsedThemePackage={
  manifest:any;
  summary:{
    homeSections:number;
    headerSections:number;
    footerSections:number;
    popupSections:number;
    homeTypes:string[];
    headerTypes:string[];
    footerTypes:string[];
    templateNames:string[];
    moduleTypes:string[];
    assetCount:number;
    cssFiles:number;
    cssBytes:number;
  };
  design:any;
  sections:any[];
  pages:Record<string,any>;
  modules:any[];
  assets:string[];
  editor:any;
  layouts:any;
  styles:Record<string,string>;
  settingsSchema:any;
  settingsData:any;
  groups:any;
  blockSchemas:any[];
  sectionSchemas?:any[];
  demo:any;
  source?:any;
};

const MAX_ZIP_BYTES=30*1024*1024;
const MAX_FILES=2000;
const MAX_FILE_BYTES=12*1024*1024;
const MAX_UNCOMPRESSED_BYTES=60*1024*1024;
const MAX_JSON_BYTES=4*1024*1024;
const MAX_CSS_FILE_BYTES=768*1024;
const MAX_CSS_TOTAL_BYTES=2*1024*1024;
const MAX_COMPRESSION_RATIO=250;
const SAFE_EXTENSIONS=new Set(['.json','.css','.png','.jpg','.jpeg','.webp','.gif','.avif','.svg','.ico','.woff','.woff2','.ttf','.otf','.txt','.md']);
const FORBIDDEN_EXTENSIONS=new Set(['.mjs','.cjs','.jsx','.ts','.tsx','.html','.htm','.php','.py','.rb','.sh','.bash','.zsh','.exe','.dll','.so','.dylib','.wasm','.jar','.class']);
const SOURCE_THEME_EXTENSIONS=new Set(['.liquid','.js']);
const RESERVED_THEME_SETTING_IDS=new Set([
  'favicon','favicon_url','logo','logo_svg','logo_image','store_logo','mobile_logo',
  'enable_wishlist','page_wishlist','enable_compare','page_compare'
]);

function extension(name:string){const base=name.split('/').pop()||'';const i=base.lastIndexOf('.');return i>=0?base.slice(i).toLowerCase():''}

function normalizePath(value:string){
  const name=String(value||'').replace(/\\/g,'/').replace(/^\.\//,'');
  if(!name||name.startsWith('/')||name.includes('\0')||/[\x00-\x1f]/.test(name)||name.split('/').some(x=>x==='..'||x===''))throw new BadRequestException(apiError('theme.zip.unsafePath'));
  if(/^[a-z]:/i.test(name)||name.length>240)throw new BadRequestException(apiError('theme.zip.unsafePath'));
  return name;
}

function findEocd(buf:Buffer){
  const sig=0x06054b50;const min=Math.max(0,buf.length-65557);
  for(let i=buf.length-22;i>=min;i--)if(buf.readUInt32LE(i)===sig)return i;
  throw new BadRequestException(apiError('theme.zip.centralDirectoryMissing'));
}

function validateThemePath(name:string){
  const base=(name.split('/').pop()||'').toLowerCase();
  if(base.startsWith('.')||base==='.env'||base==='package.json'||base==='package-lock.json'||base==='yarn.lock'||base==='pnpm-lock.yaml')throw new BadRequestException(apiError('theme.zip.forbiddenFile',{name}));
  const ext=extension(name);
  if(FORBIDDEN_EXTENSIONS.has(ext))throw new BadRequestException(apiError('theme.zip.executableForbidden',{name}));
  if(SOURCE_THEME_EXTENSIONS.has(ext)){
    const liquidOk=ext==='.liquid'&&/^theme\/(layout|sections|snippets|blocks|templates)\/.+\.liquid$/i.test(name);
    const jsOk=ext==='.js'&&/^theme\/assets\/[a-z0-9_.@+\-]+\.js$/i.test(name);
    if(!liquidOk&&!jsOk)throw new BadRequestException(apiError('theme.zip.executableForbidden',{name}));
    return;
  }
  if(ext&&!SAFE_EXTENSIONS.has(ext))throw new BadRequestException(apiError('theme.zip.unsupportedFileType',{name}));
  if(!ext&&name!=='theme.json'&&name!=='editor.json')throw new BadRequestException(apiError('theme.zip.extensionlessUnsupported',{name}));
}

export function unzipThemePackage(buf:Buffer){
  if(!Buffer.isBuffer(buf)||buf.length<22)throw new BadRequestException(apiError('theme.zip.required'));
  if(buf.length>MAX_ZIP_BYTES)throw new BadRequestException(apiError('theme.zip.tooLarge'));
  const eocd=findEocd(buf);
  const disk=buf.readUInt16LE(eocd+4),cdDisk=buf.readUInt16LE(eocd+6);
  if(disk!==0||cdDisk!==0)throw new BadRequestException(apiError('theme.zip.multiDiskUnsupported'));
  const total=buf.readUInt16LE(eocd+10);const cdSize=buf.readUInt32LE(eocd+12);const cdOffset=buf.readUInt32LE(eocd+16);
  if(total<1||total>MAX_FILES)throw new BadRequestException(apiError('theme.zip.invalidFileCount'));
  if(cdOffset+cdSize>eocd||cdOffset<0)throw new BadRequestException(apiError('theme.zip.invalidCentralDirectoryBounds'));
  const out=new Map<string,Buffer>();let pos=cdOffset;let totalUncompressed=0;
  for(let i=0;i<total;i++){
    if(pos+46>buf.length||buf.readUInt32LE(pos)!==0x02014b50)throw new BadRequestException(apiError('theme.zip.centralDirectoryCorrupt'));
    const flags=buf.readUInt16LE(pos+8);const method=buf.readUInt16LE(pos+10);const compressedSize=buf.readUInt32LE(pos+20);const size=buf.readUInt32LE(pos+24);
    const nameLen=buf.readUInt16LE(pos+28),extraLen=buf.readUInt16LE(pos+30),commentLen=buf.readUInt16LE(pos+32);const localOffset=buf.readUInt32LE(pos+42);
    if(flags&0x1)throw new BadRequestException(apiError('theme.zip.encryptedUnsupported'));
    if(pos+46+nameLen+extraLen+commentLen>buf.length)throw new BadRequestException(apiError('theme.zip.centralDirectoryOverflow'));
    const rawName=buf.subarray(pos+46,pos+46+nameLen).toString('utf8').replace(/\\/g,'/');
    pos+=46+nameLen+extraLen+commentLen;
    // ZIP directory entries legitimately end with '/'. Ignore them before normalizePath,
    // otherwise the trailing slash becomes an empty path segment and is rejected as unsafe.
    if(rawName.endsWith('/'))continue;
    const name=normalizePath(rawName);
    validateThemePath(name);
    if(out.has(name))throw new BadRequestException(apiError('theme.zip.duplicatePath',{name}));
    if(size>MAX_FILE_BYTES)throw new BadRequestException(apiError('theme.zip.fileTooLarge',{name}));
    if(size>1024*1024&&compressedSize>0&&size/compressedSize>MAX_COMPRESSION_RATIO)throw new BadRequestException(apiError('theme.zip.unsafeCompressionRatio',{name}));
    totalUncompressed+=size;if(totalUncompressed>MAX_UNCOMPRESSED_BYTES)throw new BadRequestException(apiError('theme.zip.uncompressedTooLarge'));
    if(localOffset+30>buf.length||buf.readUInt32LE(localOffset)!==0x04034b50)throw new BadRequestException(apiError('theme.zip.localHeaderCorrupt',{name}));
    const localFlags=buf.readUInt16LE(localOffset+6),localMethod=buf.readUInt16LE(localOffset+8);const localNameLen=buf.readUInt16LE(localOffset+26),localExtraLen=buf.readUInt16LE(localOffset+28);
    if(localFlags&0x1)throw new BadRequestException(apiError('theme.zip.encryptedFileUnsupported',{name}));
    if(localMethod!==method)throw new BadRequestException(apiError('theme.zip.methodMismatch',{name}));
    const localName=normalizePath(buf.subarray(localOffset+30,localOffset+30+localNameLen).toString('utf8'));
    if(localName!==name)throw new BadRequestException(apiError('theme.zip.filenameMismatch',{name}));
    const start=localOffset+30+localNameLen+localExtraLen;const end=start+compressedSize;
    if(start<0||end>buf.length)throw new BadRequestException(apiError('theme.zip.dataMissing',{name}));
    const raw=buf.subarray(start,end);let data:Buffer;
    if(method===0)data=Buffer.from(raw);
    else if(method===8){try{data=inflateRawSync(raw,{maxOutputLength:MAX_FILE_BYTES})}catch{throw new BadRequestException(apiError('theme.zip.inflateFailed',{name}))}}
    else throw new BadRequestException(apiError('theme.zip.compressionUnsupported',{method,name}));
    if(data.length!==size)throw new BadRequestException(apiError('theme.zip.sizeValidationFailed',{name}));
    out.set(name,data);
  }
  return out;
}

function auditJsonShape(value:any,path:string){
  let nodes=0;
  const walk=(node:any,depth:number)=>{
    nodes++;if(nodes>100000)throw new BadRequestException(apiError('theme.json.tooComplex',{path}));
    if(depth>40)throw new BadRequestException(apiError('theme.json.tooDeep',{path}));
    if(Array.isArray(node)){if(node.length>10000)throw new BadRequestException(apiError('theme.json.arrayTooLarge',{path}));for(const x of node)walk(x,depth+1);return}
    if(node&&typeof node==='object'){const keys=Object.keys(node);if(keys.length>10000)throw new BadRequestException(apiError('theme.json.objectTooLarge',{path}));for(const k of keys){if(k==='__proto__'||k==='prototype'||k==='constructor')throw new BadRequestException(apiError('theme.json.unsafeKey',{path}));walk(node[k],depth+1)}}
  };
  walk(value,0);return value;
}

function json(entries:Map<string,Buffer>,path:string,required=false){
  const safePath=normalizePath(path);const raw=entries.get(safePath);
  if(!raw){if(required)throw new BadRequestException(apiError('theme.package.requiredFileMissing',{path:safePath}));return null;}
  if(raw.length>MAX_JSON_BYTES)throw new BadRequestException(apiError('theme.json.fileTooLarge',{path:safePath}));
  try{return auditJsonShape(JSON.parse(raw.toString('utf8')),safePath)}catch(e:any){if(e instanceof BadRequestException)throw e;throw new BadRequestException(apiError('theme.json.invalid',{path:safePath}))}
}

function assertDeclarative(value:any,label:string){
  const walk=(node:any)=>{
    if(Array.isArray(node)){for(const x of node)walk(x);return}
    if(node&&typeof node==='object'){
      for(const [k,v] of Object.entries(node)){
        if(/^(script|javascript|code|sourcecode|componentsource|rawhtml|html)$/i.test(k))throw new BadRequestException(apiError('theme.declarative.rawCodeField',{label,key:k}));
        walk(v);
      }
      return;
    }
    if(typeof node==='string'&&(/javascript\s*:/i.test(node)||/<script\b/i.test(node)||/<iframe\b/i.test(node)||/<object\b/i.test(node)))throw new BadRequestException(apiError('theme.declarative.unsafeContent',{label}));
  };
  walk(value);return value;
}

function groupTypes(group:any){const sections=group?.sections&&typeof group.sections==='object'?group.sections:{};const order=Array.isArray(group?.order)?group.order:Object.keys(sections);return order.map((id:any)=>String(sections?.[id]?.type||'')).filter(Boolean)}
function groupFirst(group:any){const sections=group?.sections&&typeof group.sections==='object'?group.sections:{};const order=Array.isArray(group?.order)?group.order:Object.keys(sections);const id=String(order[0]||'');const row=id?sections[id]:null;return row&&typeof row==='object'?{id,...row}:null}

function normalizeSectionSettings(row:any){
  const settings:any=row?.settings&&typeof row.settings==='object'&&!Array.isArray(row.settings)?{...row.settings}:{};
  const blocks:any=row?.blocks&&typeof row.blocks==='object'&&!Array.isArray(row.blocks)?row.blocks:{};
  const blockOrder:any[]=Array.isArray(row?.block_order)?row.block_order:Object.keys(blocks);
  const rawItems=blockOrder.map((rawId:any)=>{const id=String(rawId||'');const block:any=blocks[id]||{};const b:any=block?.settings&&typeof block.settings==='object'&&!Array.isArray(block.settings)?{...block.settings}:{};return{...b,blockId:id,blockType:String(block?.type||'item')}});
  // Keep the original section/block contract. The editor uses this to expose the theme's
  // own module schema instead of reducing every module to a generic Ticarti form.
  settings.__blocks=rawItems.map((x:any)=>({id:String(x.blockId||''),type:String(x.blockType||'item'),settings:Object.fromEntries(Object.entries(x).filter(([k])=>!['blockId','blockType'].includes(k)))}));
  settings.__blockOrder=blockOrder.map((x:any)=>String(x));
  const type=String(row?.type||'').replaceAll('_','-').toLowerCase();
  const item=(x:any)=>({
    ...x,
    title:x.title??x.heading_text??x.collection_name??x.block_heading??'',
    subtitle:x.subtitle??x.main_subheading??'',
    content:x.content??x.desc??x.description??x.block_text??'',
    buttonText:x.buttonText??x.button_name??'',
    linkUrl:x.linkUrl??x.url??x.custom_link??'',
    imageUrl:x.imageUrl??x.image??'',
    mobileImageUrl:x.mobileImageUrl??x.image_mobile??'',
    videoUrl:x.videoUrl??x.video_url??'',
    categorySlug:x.categorySlug??x.collection??'',
    productSlug:x.productSlug??x.product??'',
    icon:x.icon??x.icon_name??'',
    author:x.author??'',
    role:x.role??x.author_description??'',
    rating:x.rating??5,
    text:x.text??x.heading_text??x.block_heading??x.collection_name??'',
  });
  if(rawItems.length)settings.items=rawItems.map(item);
  if(type==='ticarti-review'||type==='theme-review'){settings.reviewSource='demo';settings.items=rawItems.map((x:any)=>({...item(x),title:x.heading_text||x.title||'',content:x.desc||x.description||'',imageUrl:x.image||'',author:x.author||'',role:x.author_description||'',rating:Number(x.rating||5)}));}
  if(type==='accordion'){settings.items=rawItems.map((x:any)=>({...item(x),title:x.heading_text||x.title||'',content:x.description||x.desc||x.content||''}));}
  if(type==='text-columns-with-icons-type-2'){settings.items=rawItems.map((x:any)=>({...item(x),title:x.block_heading||x.heading_text||'',content:x.block_text||x.description||'',icon:x.icon_name||x.icon||''}));}
  if(type==='media-with-text'){
    for(const x of rawItems){const bt=String(x.blockType||'');if(bt==='media'){settings.imageUrl=x.image||settings.imageUrl||'';settings.videoUrl=x.video_url||settings.videoUrl||'';}else if(bt==='heading'){settings.main_subheading=x.main_subheading||settings.main_subheading;settings.main_heading=x.main_heading||x.heading_text||settings.main_heading;}else if(bt==='richtext'){settings.body=x.text||x.desc||x.description||settings.body;}else if(bt==='button'){settings.buttonText=x.button_name||x.text||settings.buttonText;settings.linkUrl=x.url||settings.linkUrl;}}
  }
  if(type==='shop-the-feed')settings.__sectionName='shop-the-feed';
  return settings;
}
function toSectionRows(pageKey:string,group:any){
  const sections=group?.sections&&typeof group.sections==='object'?group.sections:{};const order=Array.isArray(group?.order)?group.order:Object.keys(sections);
  if(order.length>500)throw new BadRequestException(apiError('theme.page.tooManySections',{pageKey}));
  return order.map((rawId:any,index:number)=>{const id=String(rawId||`section-${index}`);const row:any=sections[id]||{};const settings=normalizeSectionSettings(row);let sectionType=String(row?.type||'rich-text');if(sectionType==='ticarti-review')sectionType='reviews';return{id,sourceId:`${pageKey}-${id}`,pageKey,sectionType,sortOrder:index,enabled:row?.disabled!==true&&row?.enabled!==false,settings:{...settings,__sourceId:`${pageKey}-${id}`}}});
}

function safeThemeCss(entries:Map<string,Buffer>,path:string){
  const raw=entries.get(path);if(!raw)return '';
  if(raw.length>MAX_CSS_FILE_BYTES)throw new BadRequestException(apiError('theme.css.fileTooLarge',{path}));
  const value=raw.toString('utf8');
  const forbidden=[/@import\b/i,/javascript\s*:/i,/expression\s*\(/i,/behavior\s*:/i,/-moz-binding\s*:/i,/<\/?style/i,/<script\b/i,/url\s*\(\s*['"]?\s*data:text\/html/i];
  if(forbidden.some(x=>x.test(value)))throw new BadRequestException(apiError('theme.css.unsafe',{path}));
  return value;
}

function validateSvg(name:string,data:Buffer){
  if(extension(name)!=='.svg')return;
  const text=data.toString('utf8');
  if(text.length>1024*1024)throw new BadRequestException(apiError('theme.svg.tooLarge',{name}));
  const unsafe=/<script\b|<foreignObject\b|<iframe\b|<object\b|<embed\b|\son[a-z]+\s*=|javascript\s*:/i;
  if(unsafe.test(text))throw new BadRequestException(apiError('theme.svg.unsafe',{name}));
}

function parseLayouts(entries:Map<string,Buffer>){
  const registry=assertDeclarative(json(entries,'layouts/registry.json',false)||{headers:[],footers:[],defaults:{}},'Layout registry');
  const load=(kind:'headers'|'footers')=>{const refs=Array.isArray(registry?.[kind])?registry[kind]:[];if(refs.length>100)throw new BadRequestException(apiError('theme.layout.tooMany',{kind}));return refs.map((ref:any,index:number)=>{const id=String(ref?.id||'').trim();if(!/^[a-z0-9][a-z0-9-_]{0,79}$/i.test(id))throw new BadRequestException(apiError('theme.layout.invalidId',{id:id||index}));const expectedPrefix=`layouts/${kind}/`;const file=normalizePath(String(ref?.file||`${expectedPrefix}${id}.json`));if(!file.startsWith(expectedPrefix)||!file.endsWith('.json'))throw new BadRequestException(apiError('theme.layout.invalidFile',{file}));const row=assertDeclarative(json(entries,file,true),`Layout ${file}`);if(String(row?.id||id)!==id)throw new BadRequestException(apiError('theme.layout.idMismatch',{file}));if(String(row?.type||kind.slice(0,-1))!==kind.slice(0,-1))throw new BadRequestException(apiError('theme.layout.invalidType',{file}));return{...row,id,name:String(row?.name||ref?.name||id)}})};
  const headers=load('headers'),footers=load('footers');const defaults=registry?.defaults&&typeof registry.defaults==='object'?{...registry.defaults}:{};
  if(headers.length&&!headers.some((x:any)=>x.id===String(defaults.header||headers[0].id)))defaults.header=headers[0].id;
  if(footers.length&&!footers.some((x:any)=>x.id===String(defaults.footer||footers[0].id)))defaults.footer=footers[0].id;
  return{headers,footers,defaults,pageAssignments:registry?.pageAssignments&&typeof registry.pageAssignments==='object'?registry.pageAssignments:{}};
}

function parseThemeStyles(entries:Map<string,Buffer>){
  const styles:Record<string,string>={};let total=0;
  for(const [name] of entries){if(!name.startsWith('styles/')||!name.endsWith('.css'))continue;const value=safeThemeCss(entries,name);total+=Buffer.byteLength(value);if(total>MAX_CSS_TOTAL_BYTES)throw new BadRequestException(apiError('theme.css.totalTooLarge'));styles[name]=value}
  return styles;
}

function isReservedSettingId(id:string){return ['license','supportcode'].includes(String(id||'').toLowerCase())}
function sanitizeSettingsSchema(schema:any){
  const walk=(node:any):any=>{
    if(Array.isArray(node))return node.map(walk).filter(x=>x!==undefined);
    if(!node||typeof node!=='object')return node;
    const id=String((node as any).id||'').trim();if(id&&isReservedSettingId(id))return undefined;
    const out:any={};for(const [k,v] of Object.entries(node)){const next=walk(v);if(next!==undefined)out[k]=next}
    if(Array.isArray((node as any).settings)&&Array.isArray(out.settings)&&out.settings.length===0&&Object.keys(out).every(k=>['name','label','settings'].includes(k)))return undefined;
    return out;
  };
  return assertDeclarative(walk(schema)||{},'theme settings schema');
}

function settingsDefaults(schema:any){
  const out:any={};
  const groups=Array.isArray(schema)?schema:(Array.isArray(schema?.groups)?schema.groups:[]);
  for(const group of groups){
    const rows=Array.isArray(group?.settings)?group.settings:[];
    for(const row of rows){
      const id=String(row?.id||row?.key||'').trim();
      if(!id||isReservedSettingId(id))continue;
      if(row?.default!==undefined)out[id]=row.default;
    }
  }
  return out;
}

function nativeDesign(manifest:any,settingsData:any,headerGroup:any,footerGroup:any,layouts:any,styles:Record<string,string>,settingsSchema:any){
  const rawCurrent:any=settingsData?.current&&typeof settingsData.current==='object'?settingsData.current:{};
  // Shopify semantics: schema defaults are the baseline, settings_data.current overrides them.
  // Keep unknown preset keys too; some theme versions retain valid settings that were removed from a later schema.
  const current:any={...settingsDefaults(settingsSchema),...rawCurrent};
  const fallbackHeader=groupFirst(headerGroup);const fallbackFooter=groupFirst(footerGroup);
  const headerId=String(current.active_header||layouts?.defaults?.header||fallbackHeader?.id||'');
  const footerId=String(current.active_footer||layouts?.defaults?.footer||fallbackFooter?.id||'');
  const bodyFont=String(current.google_font_name_body||current.type_body_font||'Inter');
  const headingFont=String(current.google_font_name_heading||current.type_header_font||bodyFont||'Inter');
  const base=String(current.color_base||'#111111');
  const accent=String(current.color_accent||'#111111');
  const background=String(current.color_background||'#ffffff');
  const surface=String(current.color_secondary_background||'#ffffff');
  const border=String(current.color_lines||'#e7e7e7');
  return{
    general:{
      themeName:String(current.theme_name||manifest.name||manifest.slug||'Ticarti'),
      bodyFont,paragraphFont:bodyFont,headingFont,
      primaryColor:accent,secondaryColor:base,accentColor:accent,
      textColor:base,headingColor:String(current.color_heading||base),
      backgroundColor:background,surfaceColor:surface,borderColor:border,
      containerWidth:Number(current.page_width||1280),
      sectionSpacing:Number(current.top_normal_desktop||56),
      borderRadius:Number(current.roundness||10),buttonRadius:Number(current.roundness_button||8),
      activeHeader:headerId,activeFooter:footerId,
      engine:'ticarti-native',packageSlug:String(manifest.slug||manifest.id||''),packageVersion:String(manifest.version||'1.0.0')
    },
    header:{activeLayoutId:headerId},footer:{activeLayoutId:footerId},products:{},
    layouts,themeStyles:styles,
    // The package schema is the editor contract. The exact current values are the rendering source of truth.
    themeSettingsSchema:settingsSchema||{},
    themeSettings:{general:{...current,active_header:headerId,active_footer:footerId}}
  };
}


function sourceJson(entries:Map<string,Buffer>,path:string,required=false){
  const safePath=normalizePath(path);const raw=entries.get(safePath);
  if(!raw){if(required)throw new BadRequestException(apiError('theme.package.requiredFileMissing',{path:safePath}));return null;}
  if(raw.length>MAX_JSON_BYTES)throw new BadRequestException(apiError('theme.json.fileTooLarge',{path:safePath}));
  const text=raw.toString('utf8').replace(/^\s*\/\*[\s\S]*?\*\/\s*/,'');
  try{return auditJsonShape(JSON.parse(text),safePath)}catch(e:any){if(e instanceof BadRequestException)throw e;throw new BadRequestException(apiError('theme.json.invalid',{path:safePath}))}
}
function liquidSchema(entries:Map<string,Buffer>,path:string){
  const raw=entries.get(path);if(!raw)return null;const text=raw.toString('utf8');
  const match=text.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/i);if(!match)return null;
  try{return auditJsonShape(JSON.parse(match[1]),path+'#schema')}catch{return null}
}
function sourceTemplateKey(file:string){return file.slice('theme/templates/'.length).replace(/\.(json|liquid)$/i,'')}
function sourceTypes(group:any){return groupTypes(group)}
function sourceModuleSchemas(entries:Map<string,Buffer>,templates:Record<string,any>,groups:any){
  const used=new Set<string>();
  const collect=(node:any)=>{if(!node||typeof node!=='object')return;const sections=node.sections&&typeof node.sections==='object'?node.sections:{};for(const row of Object.values(sections) as any[]){const t=String(row?.type||'').trim();if(t)used.add(t)}};
  for(const t of Object.values(templates))collect(t);collect(groups.header);collect(groups.footer);collect(groups.popups);
  const discovered=new Set<string>(used);
  for(const [file] of entries){
    const m=file.match(/^theme\/sections\/([^/]+)\.liquid$/i);
    if(m)discovered.add(m[1]);
  }
  const modules:any[]=[];
  for(const type of [...discovered].sort()){
    const path=`theme/sections/${type}.liquid`;const schema=liquidSchema(entries,path);if(!schema)continue;
    const clean={...schema,settings:Array.isArray(schema?.settings)?schema.settings:[],blocks:Array.isArray(schema?.blocks)?schema.blocks:[],presets:Array.isArray(schema?.presets)?schema.presets:[]};
    modules.push({type,name:String(schema?.name||type),schema:clean,source:path,used:used.has(type),addable:Array.isArray(schema?.presets)&&schema.presets.length>0});
  }
  return modules;
}
function parseSourceTheme(entries:Map<string,Buffer>,manifest:any,slug:string,name:string,version:string):ParsedThemePackage{
  const root=String(manifest?.sourceRoot||'theme').replace(/^\/+|\/+$/g,'')||'theme';if(root!=='theme')throw new BadRequestException(apiError('theme.package.invalidEngine'));
  if(!entries.has('theme/layout/theme.liquid'))throw new BadRequestException(apiError('theme.package.requiredFileMissing',{path:'theme/layout/theme.liquid'}));
  const settingsSchema=sanitizeSettingsSchema(sourceJson(entries,'theme/config/settings_schema.json',true)||[]);
  const settingsData=assertDeclarative(sourceJson(entries,'theme/config/settings_data.json',true)||{current:{}},'theme settings data');
  const pages:Record<string,any>={};
  for(const [file] of entries){if(file.startsWith('theme/templates/')&&file.endsWith('.json')){const key=sourceTemplateKey(file);pages[key]=assertDeclarative(sourceJson(entries,file,false)||{},`Template ${file}`)}}
  const header=assertDeclarative(sourceJson(entries,'theme/sections/header-group.json',false)||{type:'header',sections:{},order:[]},'header group');
  const footer=assertDeclarative(sourceJson(entries,'theme/sections/footer-group.json',false)||{type:'footer',sections:{},order:[]},'footer group');
  const popups=assertDeclarative(sourceJson(entries,'theme/sections/popups-group.json',false)||{type:'aside',sections:{},order:[]},'popups group');
  const groups={header,footer,popups};const modules=sourceModuleSchemas(entries,pages,groups);const sectionSchemas=modules.map((x:any)=>({type:x.type,name:x.name,schema:x.schema,source:x.source,used:!!x.used,addable:!!x.addable}));const blockSchemas:any[]=[];
  const home=pages.index||{sections:{},order:[]};const sections=toSectionRows('home',home);
  const assets=[...entries.keys()].filter(x=>x.startsWith('theme/assets/')).sort();
  const cssFiles=assets.filter(x=>x.endsWith('.css')).length;const cssBytes=assets.filter(x=>x.endsWith('.css')).reduce((n,x)=>n+(entries.get(x)?.length||0),0);
  const design={general:{engine:'ticarti-liquid-source',packageSlug:slug,packageVersion:version},themeSettingsSchema:settingsSchema,themeSettings:{general:{...(settingsData?.current||{})}}};
  return{manifest:{...manifest,slug,name,version,engine:'ticarti-liquid-source',sourceRoot:'theme'},summary:{homeSections:sourceTypes(home).length,headerSections:sourceTypes(header).length,footerSections:sourceTypes(footer).length,popupSections:sourceTypes(popups).length,homeTypes:sourceTypes(home),headerTypes:sourceTypes(header),footerTypes:sourceTypes(footer),templateNames:Object.keys(pages).sort(),moduleTypes:modules.map((x:any)=>String(x.type||'')),assetCount:assets.length,cssFiles,cssBytes},design,sections,pages,modules,assets,editor:{mode:'theme-source'},layouts:{headers:[],footers:[],defaults:{},pageAssignments:{}},styles:{},settingsSchema,settingsData,groups,blockSchemas,sectionSchemas,demo:{},source:{root:'theme',layout:'theme/layout/theme.liquid',sectionCount:sectionSchemas.length}} as any;
}

function themeCatalogVisuals(entries:Map<string,Buffer>){
  const mime=(path:string)=>{const x=path.toLowerCase();return x.endsWith('.svg')?'image/svg+xml':x.endsWith('.webp')?'image/webp':x.endsWith('.avif')?'image/avif':x.endsWith('.jpg')||x.endsWith('.jpeg')?'image/jpeg':'image/png'};
  const pick=(paths:string[])=>{for(const path of paths){const data=entries.get(path);if(data&&data.length<=5*1024*1024)return{path,mime:mime(path),data}}return null};
  const screenshots:any[]=[];for(const[path,data]of entries){if(!/^(theme\/)?screenshots\//i.test(path)||data.length>5*1024*1024||!/\.(png|jpe?g|webp|avif)$/i.test(path))continue;screenshots.push({path,mime:mime(path),data});if(screenshots.length>=12)break}
  return{icon:pick(['theme/icon.svg','theme/icon.png','theme/icon.webp','icon.svg','icon.png']),preview:pick(['theme/preview.webp','theme/preview.png','theme/preview.jpg','preview.webp','preview.png','preview.jpg']),screenshots};
}

export function parseThemePackage(buf:Buffer):ParsedThemePackage & {visuals?:any}{
  const entries=unzipThemePackage(buf);for(const [name,data] of entries)validateSvg(name,data);
  const manifest=assertDeclarative(json(entries,'theme.json',true),'theme manifest');
  if(manifest?.format!=='ticarti-theme-package'||Number(manifest?.formatVersion)!==1)throw new BadRequestException(apiError('theme.package.unsupportedFormat'));
  const engine=String(manifest?.engine||'');if(!['ticarti-native','ticarti-liquid-source'].includes(engine))throw new BadRequestException(apiError('theme.package.invalidEngine'));
  const slug=String(manifest.slug||manifest.id||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9-]{1,79}$/.test(slug))throw new BadRequestException(apiError('theme.package.invalidSlug'));
  const name=String(manifest.name||'').trim();if(name.length<2||name.length>120)throw new BadRequestException(apiError('theme.package.invalidName'));
  const version=String(manifest.version||'').trim();if(!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version))throw new BadRequestException(apiError('theme.package.invalidVersion'));
  if(engine==='ticarti-liquid-source')return {...parseSourceTheme(entries,manifest,slug,name,version),visuals:themeCatalogVisuals(entries)} as any;
  const entry=(key:string,fallback:string)=>{const p=normalizePath(String(manifest?.entrypoints?.[key]||fallback));if(!p.endsWith('.json'))throw new BadRequestException(apiError('theme.package.entrypointMustBeJson',{key}));return p};
  const home=json(entries,entry('home','preset/templates/index.json'),true);const settingsData=json(entries,entry('settings','preset/config/settings_data.json'),true);const header=json(entries,entry('header','preset/sections/header-group.json'),true);const footer=json(entries,entry('footer','preset/sections/footer-group.json'),true);const popups=json(entries,entry('popups','preset/sections/popups-group.json'),false)||{sections:{},order:[]};
  const demoPath=manifest?.entrypoints?.demo?entry('demo','demo/content.json'):'demo/content.json';const demo=assertDeclarative(json(entries,demoPath,false)||{},'theme demo content');
  const pages:Record<string,any>={};for(const [file] of entries){if(file.startsWith('preset/templates/')&&file.endsWith('.json')){const key=file.slice('preset/templates/'.length,-5);if(!/^[a-z0-9][a-z0-9._-]{0,119}$/i.test(key))throw new BadRequestException(apiError('theme.package.invalidTemplateName',{key}));pages[key]=json(entries,file,false)}}
  const moduleRegistry=assertDeclarative(json(entries,'modules/registry.json',false)||{},'module registry');const modules=Array.isArray(moduleRegistry?.modules)?moduleRegistry.modules:[];if(modules.length>200)throw new BadRequestException(apiError('theme.package.tooManyModules'));const blockSchemas=Array.isArray(moduleRegistry?.blocks)?moduleRegistry.blocks:[];if(blockSchemas.length>200)throw new BadRequestException(apiError('theme.package.tooManyModules'));
  const assets=[...entries.keys()].filter(x=>x.startsWith('assets/')&&!x.endsWith('/')).sort();if(assets.length>1200)throw new BadRequestException(apiError('theme.package.tooManyAssets'));
  const editor=assertDeclarative(json(entries,'editor.json',false)||{},'theme editor definition');const layouts=parseLayouts(entries);const styles=parseThemeStyles(entries);const rawSettingsSchema=json(entries,'config/settings_schema.json',false)||json(entries,'config/theme-settings.schema.json',false)||{};const settingsSchema=sanitizeSettingsSchema(rawSettingsSchema);
  const design=nativeDesign({...manifest,slug},settingsData,header,footer,layouts,styles,settingsSchema);const sections=toSectionRows('home',home);
  const homeTypes=groupTypes(home),headerTypes=groupTypes(header),footerTypes=groupTypes(footer),popupTypes=groupTypes(popups);const cssBytes=Object.values(styles).reduce((n,v)=>n+Buffer.byteLength(v),0);
  return{manifest:{...manifest,slug,name,version},summary:{homeSections:homeTypes.length,headerSections:headerTypes.length,footerSections:footerTypes.length,popupSections:popupTypes.length,homeTypes,headerTypes,footerTypes,templateNames:Object.keys(pages).sort(),moduleTypes:modules.map((x:any)=>String(x?.type||'')).filter(Boolean),assetCount:assets.length,cssFiles:Object.keys(styles).length,cssBytes},design,sections,pages,modules,assets,editor,layouts,styles,settingsSchema,settingsData,groups:{header,footer,popups},blockSchemas,demo,visuals:themeCatalogVisuals(entries)} as any;
}
