import payload from './ticarti-skins.json';
type AnyMap=Record<string,any>;
export type TicartiSkin={slug:string;name:string;group?:string;category?:string;sortOrder?:number;design:AnyMap;homePreset:any[];verifiedFromDemo?:boolean;aliases?:string[]};
const data:any=payload;
export const TICARTI_DEFAULT_SKIN=String(data.defaultSkin||'demo-1');
export const TICARTI_SKINS:TicartiSkin[]=Array.isArray(data.skins)?data.skins:[];
const aliases=new Map<string,string>();
for(const s of TICARTI_SKINS){aliases.set(String(s.slug).toLowerCase(),s.slug);aliases.set(String(s.name||'').toLowerCase(),s.slug);for(const a of s.aliases||[])aliases.set(String(a).toLowerCase(),s.slug)}
aliases.set('18-lingerie-store','lingerie-store');aliases.set('18 lingerie store','lingerie-store');aliases.set('lingerie','lingerie-store');
export function normalizeTicartiSkinSlug(value:any){const raw=String(value||'').trim().toLowerCase();if(!raw)return TICARTI_DEFAULT_SKIN;return aliases.get(raw)||raw.replace(/\s+/g,'-')}
export function getTicartiSkinPreset(value:any):TicartiSkin{const slug=normalizeTicartiSkinSlug(value);return TICARTI_SKINS.find(x=>x.slug===slug)||TICARTI_SKINS.find(x=>x.slug===TICARTI_DEFAULT_SKIN)||TICARTI_SKINS[0]}
export function ticartiSkinCatalog(){return TICARTI_SKINS}
