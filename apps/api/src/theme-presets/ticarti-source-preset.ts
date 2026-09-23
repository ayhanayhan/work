import {getTicartiSkinPreset,normalizeTicartiSkinSlug,ticartiSkinCatalog,TICARTI_DEFAULT_SKIN} from './ticarti-skins';

type AnyMap=Record<string,any>;
const isMap=(value:any):value is AnyMap=>!!value&&typeof value==='object'&&!Array.isArray(value);
const clone=<T>(value:T):T=>value===undefined?value:JSON.parse(JSON.stringify(value));

export function mergeThemeValue(base:any,override:any):any{
  if(override===undefined)return clone(base);
  if(Array.isArray(base)||Array.isArray(override))return clone(override);
  if(isMap(base)&&isMap(override)){
    const out:AnyMap={...clone(base)};
    for(const [key,value] of Object.entries(override))out[key]=mergeThemeValue(out[key],value);
    return out;
  }
  return clone(override);
}

export function compactThemeValue(value:any):any{
  if(value===undefined||value===null)return undefined;
  if(typeof value==='string'&&value.trim()==='')return undefined;
  if(Array.isArray(value)){
    const next=value.map(compactThemeValue).filter(v=>v!==undefined);
    return next.length?next:undefined;
  }
  if(isMap(value)){
    const out:AnyMap={};
    for(const [key,raw] of Object.entries(value)){
      const next=compactThemeValue(raw);
      if(next!==undefined)out[key]=next;
    }
    return Object.keys(out).length?out:undefined;
  }
  return value;
}

export function diffThemeValue(current:any,base:any):any{
  if(current===undefined||current===null)return undefined;
  if(typeof current==='string'&&current.trim()==='')return undefined;
  if(Array.isArray(current)){
    if(JSON.stringify(current)===JSON.stringify(base))return undefined;
    return clone(current);
  }
  if(isMap(current)){
    const out:AnyMap={};
    const baseMap=isMap(base)?base:{};
    for(const [key,value] of Object.entries(current)){
      const diff=diffThemeValue(value,baseMap[key]);
      if(diff!==undefined)out[key]=diff;
    }
    return Object.keys(out).length?out:undefined;
  }
  return Object.is(current,base)?undefined:current;
}

export function ticartiSourceHomePreset(skinValue:any=TICARTI_DEFAULT_SKIN){
  const skin=getTicartiSkinPreset(skinValue);
  return (skin.homePreset||[]).map((x:any,i:number)=>({
    id:String(x.sourceId||`${skin.slug}-${i}`),
    sourceId:String(x.sourceId||`${skin.slug}-${i}`),
    pageKey:'home',
    sectionType:String(x.sectionType||'rich_text'),
    sortOrder:Number(x.sortOrder??i),
    enabled:x.enabled!==false,
    settings:{...(x.settings||{}),__sourceId:String(x.sourceId||`${skin.slug}-${i}`)},
  }));
}

export function ticartiSourceDesignForSkin(skinValue:any=TICARTI_DEFAULT_SKIN):AnyMap{
  const skin=getTicartiSkinPreset(skinValue);
  const d:any=skin.design||{};
  return {
    ...clone(d),
    general:{...(d.general||{}),themeId:'ticarti',themePackageId:'ticarti',themeName:String(d.general?.themeName||'Ticarti'),themeSourceVersion:'ticarti-skins-v5',skinSlug:skin.slug,skin:skin.slug,skinName:skin.name},
    header:{...(d.header||{})},footer:{...(d.footer||{})},products:{...(d.products||{})},
    themeSettings:{...(d.themeSettings||{}),general:{...(d.themeSettings?.general||{})},header:{...(d.themeSettings?.header||{})},footer:{...(d.themeSettings?.footer||{})},products:{...(d.themeSettings?.products||{})}}
  };
}

export function resolveTicartiDesign(skinValue:any,overrides:any):AnyMap{
  return mergeThemeValue(ticartiSourceDesignForSkin(skinValue),isMap(overrides)?overrides:{});
}

export function diffTicartiDesign(skinValue:any,current:any):AnyMap{
  return (diffThemeValue(current,ticartiSourceDesignForSkin(skinValue))||{}) as AnyMap;
}

export function resolveTicartiSections(skinValue:any,overrides:any[]):any[]{
  const base=ticartiSourceHomePreset(skinValue);
  const bySource=new Map(base.map((row:any)=>[String(row.sourceId),row]));
  const overrideMap=new Map((Array.isArray(overrides)?overrides:[]).map((row:any)=>[String(row?.sourceId||row?.settings?.__sourceId||row?.id||''),row]));
  const out:any[]=[];
  for(const source of base){
    const patch:any=overrideMap.get(String(source.sourceId));
    if(patch?.removed===true)continue;
    if(!patch){out.push(source);continue;}
    const merged:any=mergeThemeValue(source,patch);
    merged.settings=mergeThemeValue(source.settings||{},patch.settings||{});
    merged.id=String(patch.id||source.id||source.sourceId);
    merged.sourceId=String(source.sourceId);
    out.push(merged);
  }
  for(const patch of Array.isArray(overrides)?overrides:[]){
    const sourceId=String(patch?.sourceId||patch?.settings?.__sourceId||patch?.id||'');
    if(!sourceId||bySource.has(sourceId)||patch?.removed===true)continue;
    out.push({...patch,id:String(patch.id||sourceId),sourceId,pageKey:'home',settings:{...(patch.settings||{}),__sourceId:sourceId}});
  }
  return out.sort((a,b)=>Number(a.sortOrder??0)-Number(b.sortOrder??0)).map((row,index)=>({...row,sortOrder:index}));
}

export function diffTicartiSections(skinValue:any,current:any[]):any[]{
  const base=ticartiSourceHomePreset(skinValue);
  const baseBySource=new Map(base.map((row:any)=>[String(row.sourceId),row]));
  const currentRows=Array.isArray(current)?current:[];
  const currentIds=new Set(currentRows.map((row:any)=>String(row?.sourceId||row?.settings?.__sourceId||row?.id||'')));
  const out:any[]=[];
  for(const source of base){
    if(!currentIds.has(String(source.sourceId)))out.push({sourceId:String(source.sourceId),removed:true});
  }
  currentRows.forEach((row:any,index:number)=>{
    const sourceId=String(row?.sourceId||row?.settings?.__sourceId||row?.id||`section-${index}`);
    const normalized={...row,id:String(row?.id||sourceId),sourceId,pageKey:'home',sortOrder:index,enabled:row?.enabled!==false,settings:{...(row?.settings||{}),__sourceId:sourceId}};
    const baseRow:any=baseBySource.get(sourceId);
    if(!baseRow){const compact=compactThemeValue(normalized);if(compact)out.push(compact);return;}
    const patch:any=diffThemeValue(normalized,{...baseRow,sortOrder:baseRow.sortOrder??index});
    if(patch){patch.sourceId=sourceId;delete patch.pageKey;if(patch.settings&&Object.keys(patch.settings).length===1&&patch.settings.__sourceId===sourceId)delete patch.settings;out.push(patch);}
  });
  return out;
}

export const ticartiSourceDesign:AnyMap=ticartiSourceDesignForSkin(TICARTI_DEFAULT_SKIN);
export {normalizeTicartiSkinSlug,ticartiSkinCatalog,TICARTI_DEFAULT_SKIN};
