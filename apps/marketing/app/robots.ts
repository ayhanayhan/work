import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {getWebsiteSeo} from '@/lib/site-seo';

export const dynamic='force-dynamic';
export default async function robots():Promise<MetadataRoute.Robots>{
 const h=await headers();
 if(h.get('x-ticarti-help-host')==='1'){
  return {rules:{userAgent:'*',allow:['/'],disallow:['/help','/yardim','/api/']},
   sitemap:'https://help.ticarti.com/sitemap.xml'};
 }
 const publicProxy=h.get('x-ticarti-site-proxy')==='1'&&h.get('x-forwarded-host')==='ticarti.com';
 const host=h.get('host')||'';
 if(!publicProxy&&(host.endsWith('.hosted.app')||host.includes('localhost')||host.includes('127.0.0.1'))){
  return {rules:{userAgent:'*',disallow:'/'}};
 }
 const seo=await getWebsiteSeo();
 const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
 if(seo?.allowIndexing===false)return {rules:{userAgent:'*',disallow:'/'},sitemap:site+'/sitemap.xml'};
 const disallow=[
  '/api/','/login.html','/register.html','/cart','/checkout','/account',
  ...['en','de','ru','ar'].flatMap(l=>['/'+l+'/login.html','/'+l+'/register.html'])
 ];
 const allow=['/'];
 for(const line of (seo?.robotsText||'').split(/\r?\n/)){
  const match=/^(Allow|Disallow):\s*(\/[^\s#]*)/i.exec(line.trim());
  if(!match)continue;
  if(match[1].toLowerCase()==='allow')allow.push(match[2]);
  else disallow.push(match[2]);
 }
 return {rules:{userAgent:'*',allow:[...new Set(allow)],disallow:[...new Set(disallow)]},
  sitemap:site+'/sitemap.xml'};
}
