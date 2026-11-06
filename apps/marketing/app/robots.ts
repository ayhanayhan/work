import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';

export const dynamic='force-dynamic';
export default async function robots():Promise<MetadataRoute.Robots>{
  const host=(await headers()).get('host')||'';
  if(host.endsWith('.hosted.app')||host.includes('localhost')){
    return {rules:{userAgent:'*',disallow:'/'}};
  }
  const site=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
  return {rules:{userAgent:'*',allow:'/',disallow:[
    '/api/','/login.html','/register.html','/en/login.html','/en/register.html',
    '/pt/login.html','/pt/register.html','/ru/login.html','/ru/register.html'
  ]},sitemap:site+'/sitemap.xml'};
}
