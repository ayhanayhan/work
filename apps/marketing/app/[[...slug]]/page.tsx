import type {Metadata} from 'next';
import LegacyScripts from '@/components/legacy-scripts';
import BlogInteractions from '@/components/blog-interactions';
import {renderPage} from '@/lib/legacy';

type Props={params:Promise<{slug?:string[]}>;searchParams:Promise<{slug?:string}>};
export const dynamic='force-dynamic';

export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
  const {slug=[]}=await params;
  const page=await renderPage(slug,await searchParams);
  const lang=(slug.length&&['tr','en','pt','ru'].includes(slug[0]))?slug[0]:'tr';
  const urlPath=slug.length?'/'+slug.join('/'): '/';
  const canonical=urlPath.replace(/\/index\.html$/,'/').replace(/\/blog\/post\.html$/,'/blog');
  return {title:page.title,description:page.description,alternates:{canonical},openGraph:{title:page.title,description:page.description,locale:lang==='tr'?'tr_TR':lang}};
}
export default async function MarketingPage({params,searchParams}:Props){
  const {slug=[]}=await params;
  const page=await renderPage(slug,await searchParams);
  return <>
    <div className={page.classes} dangerouslySetInnerHTML={{__html:page.html}}/>
    {page.isBlogList?<BlogInteractions/>:null}
    <LegacyScripts sources={page.scripts} htmlClasses={page.classes}/>
  </>;
}
