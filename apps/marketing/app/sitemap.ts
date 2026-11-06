import type {MetadataRoute} from 'next';
import {getBlogPosts} from '@/lib/blog';
export const revalidate=3600;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
  const pages=['/','/paketler.html','/contacto.html','/companies/enterprise.html','/success-stories/','/blog'];
  const blogs=await getBlogPosts('tr');
  return [...pages.map(x=>({url:base+x,changeFrequency:'weekly' as const,priority:x==='/'?1:.6})),...blogs.map(p=>({url:base+'/blog/'+encodeURIComponent(p.slug),changeFrequency:'monthly' as const,priority:.5}))];
}
