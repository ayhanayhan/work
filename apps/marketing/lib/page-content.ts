import {escapeHtml,safeImage} from './blog';
import schema from '../public/assets/data/page-fields.json';

type PageFields={id:string;fields:{id:string;type:string}[]};
const pages=(schema as any).pages as PageFields[];
export function pageExists(id:string){return pages.some(p=>p.id===id)}
const API_ORIGIN=(process.env.API_ORIGIN||'').replace(/\/$/,'');
export async function pageValues(id:string,lang:string):Promise<Record<string,string>>{
  if(!API_ORIGIN||!pageExists(id))return {};
  try{
    const r=await fetch(`${API_ORIGIN}/v1/public/website/pages/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`,{next:{revalidate:30},signal:AbortSignal.timeout(3500)});
    if(!r.ok)return {};
    const value=await r.json();
    return value?.values&&typeof value.values==='object'?value.values:{};
  }catch{return {}}
}
/** Replace only text-only nodes or image src; preserve the exact original HTML element and all of its styling. */
export function applyPageValues(source:string,values:Record<string,string>,id:string){
  const page=pages.find(x=>x.id===id);if(!page)return source;
  const permitted=new Set(page.fields.map(x=>x.id));
  return source.replace(/<(h[1-4]|p|button|a|span)\b([^>]*\bdata-tc-content-key="([a-z0-9-]+)"[^>]*)>([^<>]*)<\/\1>/gi,(whole,tag,attrs,key)=>{
    const value=values[key];return permitted.has(key)&&typeof value==='string'&&value.trim()?`<${tag}${attrs}>${escapeHtml(value)}</${tag}>`:whole;
  }).replace(/<img\b[^>]*\bdata-tc-content-src="([a-z0-9-]+)"[^>]*>/gi,(whole,key)=>{
    const value=values[key];
    if(!permitted.has(key)||typeof value!=='string'||!value.trim())return whole;
    const url=safeImage(value);
    if(url=== '/assets/images/blog/store.svg'&&value!==url)return whole;
    return whole.replace(/\bsrc="[^"]*"/,`src="${escapeHtml(url)}"`);
  });
}
