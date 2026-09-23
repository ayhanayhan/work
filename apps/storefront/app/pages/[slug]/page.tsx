import type {Metadata} from 'next';
import {headers} from 'next/headers';
import ContentPageClient from './ContentPageClient';

const ORIGIN=String(process.env.API_ORIGIN||'').replace(/\/$/,'');
function storeKey(host:string){const raw=host.split(',')[0].trim().toLowerCase().replace(/:\d+$/,'');if(raw.endsWith('.ticarti.com'))return raw.slice(0,-'.ticarti.com'.length).split('.')[0]||'main';if(!raw||raw.endsWith('.hosted.app'))return process.env.NEXT_PUBLIC_STORE_SLUG||'main';return raw;}
async function readPage(slug:string,locale:string){
  if(!ORIGIN)return null;const h=await headers();const store=storeKey(h.get('x-forwarded-host')||h.get('host')||'');
  try{const r=await fetch(`${ORIGIN}/v1/storefront/${encodeURIComponent(store)}/pages/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,{next:{revalidate:60}});return r.ok?await r.json():null}catch{return null}
}
export async function generateMetadata({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{locale?:string}>}):Promise<Metadata>{const[{slug},{locale='tr-TR'}]=await Promise.all([params,searchParams]);const page=await readPage(slug,locale);if(!page)return{};return{title:page.seoTitle||page.title||undefined,description:page.seoDescription||undefined,openGraph:{title:page.seoTitle||page.title||undefined,description:page.seoDescription||undefined,images:page.imageUrl?[page.imageUrl]:undefined}}}
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{locale?:string}>}){const[{slug},{locale}]=await Promise.all([params,searchParams]);return <ContentPageClient slug={slug} locale={locale}/>}
