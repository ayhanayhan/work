import type {Metadata} from 'next';
import {headers} from 'next/headers';
import LegacyScripts from '@/components/legacy-scripts';
import BlogInteractions from '@/components/blog-interactions';
import {BLOG_LOCALES,BlogLocale,BlogPost,blogLabels,blogPath,getBlogPosts,isBlogLocale,safeImage} from '@/lib/blog';
import {renderPage,PageData} from '@/lib/legacy';

type Props={params:Promise<{slug?:string[]}>;searchParams:Promise<{slug?:string}>};
export const dynamic='force-dynamic';
const BASE=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
const absolute=(path:string)=>BASE+path;
const resolveLang=(slug:string[]):BlogLocale=>slug.length&&isBlogLocale(slug[0])?slug[0]:'tr';
const localeLabel:Record<BlogLocale,string>={tr:'tr_TR',en:'en_US',pt:'pt_PT',ru:'ru_RU'};
async function previewHost(){
  const h=await headers();
  if(h.get('x-ticarti-site-proxy')==='1'&&h.get('x-forwarded-host')==='ticarti.com')return false;
  const host=h.get('host')||'';
  return host.endsWith('.hosted.app')||host.includes('localhost')||host.includes('127.0.0.1');
}
function normalPath(slug:string[],lang:BlogLocale,page:PageData){
  if(page.post)return blogPath(lang,page.post.slug);
  if(page.isBlogList)return blogPath(lang);
  const parts=slug.length&&isBlogLocale(slug[0])?slug.slice(1):slug;
  const suffix=parts.join('/');
  const prefix=lang==='tr'?'':'/'+lang;
  if(!suffix||suffix==='index.html')return prefix+'/';
  return prefix+'/'+suffix.replace(/\/index\.html$/,'/').replace(/^index\.html$/,'');
}
function alternatesForPost(post:BlogPost){
  return Object.fromEntries(post.availableLocales.map(lang=>[lang,absolute(blogPath(lang,post.localeSlugs?.[lang]||post.slug))]));
}
function imageUrl(post:BlogPost){
  if(!post.featuredImage)return undefined;
  const src=safeImage(post.featuredImage);
  return src.startsWith('https://')?src:absolute(src);
}
function jsonLd(page:PageData,lang:BlogLocale):object[]{
  if(page.post){
    const post=page.post,path=blogPath(lang,post.slug),url=absolute(path),image=imageUrl(post);
    return [
      {
        '@context':'https://schema.org','@type':'BlogPosting',
        '@id':url+'#article',mainEntityOfPage:{'@type':'WebPage','@id':url},
        headline:post.title,description:post.seoDescription||post.excerpt,
        inLanguage:lang,articleSection:post.category,
        ...(image?{image:[image]}:{}),
        ...(post.publishedAt?{datePublished:post.publishedAt}:{}),
        ...(post.updatedAt?{dateModified:post.updatedAt}:{}),
        author:{'@type':post.authorName==='Ticarti'?'Organization':'Person',name:post.authorName},
        publisher:{'@type':'Organization',name:'Ticarti',url:BASE,
          logo:{'@type':'ImageObject',url:absolute('/assets/images/ticarti-logo.svg')}}
      },
      {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Ticarti',item:absolute(lang==='tr'?'/':'/'+lang+'/')},
        {'@type':'ListItem',position:2,name:'Blog',item:absolute(blogPath(lang))},
        {'@type':'ListItem',position:3,name:post.title,item:url}
      ]}
    ];
  }
  if(page.isBlogList){
    return [
      {'@context':'https://schema.org','@type':'Blog',
        name:'Ticarti Blog',description:blogLabels[lang].blogDescription,
        url:absolute(blogPath(lang)),inLanguage:lang,
        blogPost:(page.posts||[]).map(p=>({'@type':'BlogPosting',url:absolute(blogPath(lang,p.slug)),headline:p.title}))},
      {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[
        {'@type':'ListItem',position:1,name:'Ticarti',item:absolute(lang==='tr'?'/':'/'+lang+'/')},
        {'@type':'ListItem',position:2,name:'Blog',item:absolute(blogPath(lang))}
      ]}
    ];
  }
  if(page.isHome){
    const url=absolute(lang==='tr'?'/':'/'+lang+'/');
    return [
      {'@context':'https://schema.org','@type':'Organization','@id':BASE+'#organization',
        name:'Ticarti',url:BASE,logo:{'@type':'ImageObject',url:absolute('/assets/images/ticarti-logo.svg')}},
      {'@context':'https://schema.org','@type':'WebSite','@id':BASE+'#website',
        name:'Ticarti',url:BASE,inLanguage:lang,publisher:{'@id':BASE+'#organization'}},
      {'@context':'https://schema.org','@type':'WebPage','@id':url+'#webpage',
        url,name:page.title,description:page.description,inLanguage:lang,
        isPartOf:{'@id':BASE+'#website'}}
    ];
  }
  return [];
}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
  const {slug=[]}=await params;
  const lang=resolveLang(slug),page=await renderPage(slug,await searchParams);
  const configuredCanonical=page.post?.canonicalUrl||'';
  const canonical=configuredCanonical?(configuredCanonical.startsWith('/')?absolute(configuredCanonical):configuredCanonical):absolute(normalPath(slug,lang,page));
  const preview=await previewHost();
  const languages=page.post?alternatesForPost(page.post):page.isBlogList?
    Object.fromEntries((await Promise.all(BLOG_LOCALES.map(async code=>({
      code,count:(await getBlogPosts(code)).length
    })))).filter(x=>x.count>0).map(x=>[x.code,absolute(blogPath(x.code))])):undefined;
  const picture=page.post?.ogImage?safeImage(page.post.ogImage):page.post?imageUrl(page.post):undefined;
  const noindex=preview||page.post?.noIndex===true||slug.some(part=>part==='login'||part==='register'||part==='login.html'||part==='register.html');
  const generic={
    title:page.title,description:page.description,metadataBase:new URL(BASE),
    alternates:{canonical,languages},
    robots:noindex?{index:false,follow:false}:{index:true,follow:true},
    openGraph:{
      title:page.title,description:page.description,url:canonical,
      siteName:'Ticarti',locale:localeLabel[lang],
      ...(picture?{images:[{url:picture,alt:page.post?.imageAlt||page.title}]}:{})
    },
    twitter:{card:picture?'summary_large_image' as const:'summary' as const,title:page.title,
      description:page.description,...(picture?{images:[picture]}:{})}
  };
  if(page.post){
    return {...generic,openGraph:{...generic.openGraph,type:'article',
      ...(page.post.publishedAt?{publishedTime:page.post.publishedAt}:{}),
      ...(page.post.updatedAt?{modifiedTime:page.post.updatedAt}:{})}} as Metadata;
  }
  return {...generic,openGraph:{...generic.openGraph,type:'website'}} as Metadata;
}
export default async function MarketingPage({params,searchParams}:Props){
  const {slug=[]}=await params;
  const lang=resolveLang(slug),page=await renderPage(slug,await searchParams);
  const schemas=jsonLd(page,lang);
  return <>
    <div className={page.classes} dangerouslySetInnerHTML={{__html:page.html}}/>
    {page.isBlogList?<BlogInteractions/>:null}
    <LegacyScripts sources={page.scripts} htmlClasses={page.classes}/>
    {schemas.map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify(schema).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
    }}/>)}
  </>;
}
