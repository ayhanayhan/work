import type {MetadataRoute} from 'next';
import {BLOG_LOCALES,blogPath,getBlogPosts} from '@/lib/blog';

export const revalidate=300;
const BASE=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const pages=['/','/paketler.html','/contacto.html','/companies/enterprise.html','/success-stories/'];
  const results=await Promise.all(BLOG_LOCALES.map(async lang=>({lang,posts:await getBlogPosts(lang)})));
  const articles=results.flatMap(({lang,posts})=>posts.map(post=>({
    url:BASE+blogPath(lang,post.slug),
    changeFrequency:'monthly' as const,
    priority:0.65,
    ...(post.updatedAt?{lastModified:new Date(post.updatedAt)}:{}),
    alternates:{languages:Object.fromEntries(post.availableLocales.map(locale=>[locale,BASE+blogPath(locale,post.slug)]))}
  })));
  const archives=results.filter(result=>result.posts.length).map(({lang})=>({
    url:BASE+blogPath(lang),changeFrequency:'weekly' as const,priority:0.7,
    alternates:{languages:Object.fromEntries(results.filter(x=>x.posts.length).map(x=>[x.lang,BASE+blogPath(x.lang)]))}
  }));
  return [
    ...pages.map(route=>({url:BASE+route,changeFrequency:'weekly' as const,priority:route==='/'?1:0.6})),
    ...archives,...articles
  ];
}
