import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {getBlogPosts,getWebsiteLocales,blogPath} from '@/lib/blog';
import {getWebsiteSeo,metadataFor} from '@/lib/site-seo';
import {listTools,toolPath} from '@/components/tools-pages';

export const dynamic='force-dynamic';
const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
const pages=[
 ['home','/'],['blog','/blog'],['pricing','/paketler'],['contact','/iletisim'],
 ['enterprise','/companies/enterprise.html'],['privacy','/gizlilik-politikasi.html'],
 ['terms','/uyelik-sozlesmesi.html'],['kvkk','/kvkk.html']
] as const;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if((await headers()).get('x-ticarti-help-host')==='1'){
  // Articles are deliberately noindex until editorial content is approved.
  return [{url:'https://help.ticarti.com/',changeFrequency:'weekly',priority:1}];
 }
 const [seo,active]=await Promise.all([getWebsiteSeo(),getWebsiteLocales()]);
 if(seo?.allowIndexing===false)return [];
 const locales=active.length?active:['tr'];
 const data:MetadataRoute.Sitemap=[];
 for(const [id,path] of pages){
  const variants=locales.filter(locale=>!metadataFor(seo,id,locale).noindex);
  for(const locale of variants){
   const prefix=locale==='tr'?'':'/'+locale;
   data.push({url:origin+prefix+path,changeFrequency:id==='home'?'daily':'weekly',
    priority:id==='home'?1:id==='blog'?0.8:0.5,
    alternates:{languages:Object.fromEntries(variants.map(code=>[code,origin+(code==='tr'?'':'/'+code)+path]))}});
  }
 }

 for(const locale of locales){
  const tools=await listTools(locale);
  if(tools.length){
   for(const tool of tools){
    data.push({url:origin+toolPath(locale,tool.id),changeFrequency:'monthly',priority:0.6});
   }
  }
  for(const post of await getBlogPosts(locale)){
   if(post.noIndex)continue;
   const others=post.availableLocales.filter(l=>locales.includes(l));
   data.push({url:origin+blogPath(locale,post.slug),lastModified:post.updatedAt||post.publishedAt||undefined,
    changeFrequency:'monthly',priority:0.7,
    alternates:{languages:Object.fromEntries(others.map(code=>[code,origin+blogPath(code,post.localeSlugs?.[code]||post.slug)]))}});
  }
 }
 return data;
}
