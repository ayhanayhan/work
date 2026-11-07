/** Site SEO is sourced only from the public platform SEO resource, never mock data. */
export type PageSeo={title?:string;description?:string;ogTitle?:string;ogDescription?:string;ogImage?:string;twitterTitle?:string;twitterDescription?:string;canonicalPath?:string;noindex?:boolean};
export type WebsiteSeo={
 siteName:string;defaultOgImage:string;organizationLogo:string;robotsText:string;allowIndexing:boolean;
 pages:Record<string,Record<string,PageSeo>>;
 redirects:{from:string;to:string;permanent:boolean}[];
};
export async function getWebsiteSeo():Promise<WebsiteSeo|null>{
 const api=(process.env.API_ORIGIN||'').replace(/\/$/,'');
 if(!api)return null;
 try{
  const r=await fetch(api+'/v1/public/website/seo',{cache:'no-store',signal:AbortSignal.timeout(7000)});
  if(!r.ok)return null;
  const data=await r.json();
  if(!data||typeof data!=='object'||!data.pages)return null;
  return data as WebsiteSeo;
 }catch{return null;}
}
export const seoPageForPath=(segments:string[])=>{
 const loc=['tr','en','de','ru','ar'].includes(segments[0])?segments.slice(1):segments;
 const key=loc.join('/').replace(/\/index\.html$/,'').replace(/\.html$/,'').replace(/\/$/,'');
 if(!key||key==='index')return 'home';
 if(key==='blog')return 'blog';
 if(key.startsWith('blog/'))return 'blog-post';
 const mapping:Record<string,string>={paketler:'pricing',contacto:'contact','companies/enterprise':'enterprise','gizlilik-politikasi':'privacy','uyelik-sozlesmesi':'terms',kvkk:'kvkk'};
 return mapping[key]||'';
};
export const metadataFor=(seo:WebsiteSeo|null,page:string,locale:string):PageSeo=>{
 const entry=seo?.pages?.[page]?.[locale];
 return entry&&typeof entry==='object'?entry:{};
};
export const seoImage=(value?:string)=>{
 const v=String(value||'').trim();
 return v.startsWith('/assets/')||/^https:\/\/[^\s"'<>]+$/.test(v)?v:'';
};
