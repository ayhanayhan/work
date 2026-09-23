import catalog from './skin-presets.json';

type AnyMap=Record<string,any>;
export type TicartiSkin={slug:string;name:string;group?:string;category?:string;sortOrder?:number;previewImageUrl?:string;design:AnyMap;homePreset:any[];verifiedFromDemo?:boolean;aliases?:string[]};
const payload:any=catalog;
export const TICARTI_DEFAULT_SKIN=String(payload.defaultSkin||'demo-1');
export const TICARTI_SKINS:TicartiSkin[]=Array.isArray(payload.skins)?payload.skins:[];
const aliasMap=new Map<string,string>();
for(const skin of TICARTI_SKINS){aliasMap.set(String(skin.slug).toLowerCase(),skin.slug);aliasMap.set(String(skin.name||'').toLowerCase(),skin.slug);for(const a of skin.aliases||[])aliasMap.set(String(a).toLowerCase(),skin.slug)}
aliasMap.set('18-lingerie-store','lingerie-store');aliasMap.set('18 lingerie store','lingerie-store');aliasMap.set('lingerie','lingerie-store');
export function normalizeSkinSlug(value:any){const raw=String(value||'').trim().toLowerCase();if(!raw)return TICARTI_DEFAULT_SKIN;return aliasMap.get(raw)||raw.replace(/\s+/g,'-')}
export function skinSlugFromDesign(design:any){const g=design?.general||{};const scoped=design?.themeSettings?.general||design?.theme?.settings?.general||{};return normalizeSkinSlug(g.skinSlug||g.skin||g.skinName||scoped.skinSlug||scoped.skin||scoped.skinName||TICARTI_DEFAULT_SKIN)}
export function getTicartiSkin(value:any):TicartiSkin{const slug=normalizeSkinSlug(value);return TICARTI_SKINS.find(x=>x.slug===slug)||TICARTI_SKINS.find(x=>x.slug===TICARTI_DEFAULT_SKIN)||TICARTI_SKINS[0]}
export function resolveTicartiSkin(design:any){return getTicartiSkin(skinSlugFromDesign(design))}
function map(value:any):AnyMap{return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
export function mergeSkinDesign(design:any,skin:TicartiSkin):AnyMap{
  const base=map(skin?.design);const current=map(design);
  const baseTheme=map(base.themeSettings);const currentTheme=map(current.themeSettings);
  const merged={
    ...base,...current,
    general:{...map(base.general),...map(current.general),skinSlug:skin.slug,skin:skin.slug,skinName:skin.name,themeSourceVersion:'ticarti-skins-v4'},
    header:{...map(base.header),...map(current.header)},
    footer:{...map(base.footer),...map(current.footer)},
    products:{...map(base.products),...map(current.products)},
    themeSettings:{
      ...baseTheme,...currentTheme,
      general:{...map(baseTheme.general),...map(currentTheme.general)},
      header:{...map(baseTheme.header),...map(currentTheme.header)},
      footer:{...map(baseTheme.footer),...map(currentTheme.footer)},
      products:{...map(baseTheme.products),...map(currentTheme.products)},
    },
  };
  return merged;
}
export function skinHomePreset(design:any){const skin=resolveTicartiSkin(design);return (skin.homePreset||[]).map((x:any,i:number)=>({id:String(x.sourceId||`${skin.slug}-${i}`),sourceId:String(x.sourceId||`${skin.slug}-${i}`),sectionType:String(x.sectionType||'rich_text'),sortOrder:Number(x.sortOrder??i),enabled:x.enabled!==false,settings:{...(x.settings||{}),__sourceId:String(x.sourceId||`${skin.slug}-${i}`)}}))}
