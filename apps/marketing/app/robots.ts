import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{
  const site=process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com';
  return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/register.html','/login.html']},sitemap:site.replace(/\/$/,'')+'/sitemap.xml'};
}
