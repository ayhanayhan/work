import {getWebsiteSeo,metadataFor,seoImage,seoPageForPath} from '@/lib/site-seo';
import {redirect,permanentRedirect} from 'next/navigation';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import LegacyScripts from '@/components/legacy-scripts';
import HomeSnapshot from '@/components/home-snapshot';
import {getHomeContent} from '@/lib/home-cms';
import {moduleById,textFor} from '@/lib/home-content';
import HomeInteractions from '@/components/home-snapshot/interactions';
import BlogInteractions from '@/components/blog-interactions';
import {BlogArchive,BlogArticle} from '@/components/blog-pages';
import SiteShell from '@/components/site-shell';
import {stripLegacyShell} from '@/lib/shared-shell';
import {BlogLocale,BlogPost,blogLabel,blogPath,getBlogPosts,getWebsiteLocales,isBlogLocale,safeImage} from '@/lib/blog';
import {renderPage,PageData} from '@/lib/legacy';

type Props={params:Promise<{slug?:string[]}>;searchParams:Promise<{slug?:string}>};
export const dynamic='force-dynamic';
const BASE=(process.env.NEXT_PUBLIC_SITE_URL||'https://ticarti.com').replace(/\/$/,'');
const absolute=(path:string)=>BASE+path;
const resolveLang=async(slug:string[]):Promise<BlogLocale>=>slug.length&&(await getWebsiteLocales()).includes(slug[0])?slug[0]:'tr';
const localeLabel:Record<string,string>={tr:'tr_TR',en:'en_US',de:'de_DE',ar:'ar_SA',ru:'ru_RU'};
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
        author:post.author?{
          '@type':'Person',name:post.author.name,
          ...(post.author.seoDescription||post.author.bio?{description:post.author.seoDescription||post.author.bio}:{}),
          ...(post.author.avatar?{image:safeImage(post.author.avatar)}:{}),
          ...(Object.values(post.author.socials||{}).length?{sameAs:Object.values(post.author.socials||{})}:{}),
        }:{'@type':post.authorName==='Ticarti'?'Organization':'Person',name:post.authorName},
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
        name:'Ticarti Blog',description:blogLabel(lang).blogDescription,
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
        isPartOf:{'@id':BASE+'#website'}},
      ...(page.faq?.configured&&page.faq.enabled&&page.faq.items.length?[{
        '@context':'https://schema.org','@type':'FAQPage','@id':url+'#faq',
        inLanguage:lang,
        mainEntity:page.faq.items.map(item=>({
          '@type':'Question',name:item.question,
          acceptedAnswer:{'@type':'Answer',text:item.answer}
        }))
      }]:[])
    ];
  }
  return [];
}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{
  const {slug=[]}=await params;
  const seo=await getWebsiteSeo();
  const seoPage=seoPageForPath(slug);
  const seoLocale=slug.length&&['tr','en','de','ru','ar'].includes(slug[0])?slug[0]:'tr';
  const seoEntry=metadataFor(seo,seoPage,seoLocale);

  // Homepage is a static React snapshot until modules are deliberately connected.
  // No Master, CMS, API or HTML-template reads are permitted on this route.
  if(slug.length===0||(slug.length===1&&(slug[0]==='index.html'||['tr','en','de','ru','ar'].includes(slug[0])))||(slug.length===2&&['tr','en','de','ru','ar'].includes(slug[0])&&slug[1]==='index.html')){
    const lang=['tr','en','de','ru','ar'].includes(slug[0]||'')?slug[0]:'tr';
    const canonical=absolute(lang==='tr'?'/':'/'+lang+'/');
    const preview=await previewHost();
    const title=seoEntry.title||'Ticarti | E-Ticaretin Yeni Hali - Mağazanı Kur, Tek Yerden Yönet';
    const description=seoEntry.description||'Ticarti ile e-ticaret siteni oluştur, tek yerden yönet.';
    const ogImage=seoImage(seoEntry.ogImage||seo?.defaultOgImage);
    const finalCanonical=seoEntry.canonicalPath?absolute(seoEntry.canonicalPath):canonical;
    const languages=Object.fromEntries((await getWebsiteLocales()).map(l=>[l,absolute(l==='tr'?'/':'/'+l+'/')]));
    return {title,description,metadataBase:new URL(BASE),
      alternates:{canonical:finalCanonical,languages},
      robots:preview||seo?.allowIndexing===false||seoEntry.noindex?{index:false,follow:false}:{index:true,follow:true},
      openGraph:{title:seoEntry.ogTitle||title,description:seoEntry.ogDescription||description,
        url:finalCanonical,type:'website',siteName:seo?.siteName||'Ticarti',
        ...(ogImage?{images:[{url:ogImage}]}:{})},
      twitter:{card:ogImage?'summary_large_image':'summary',title:seoEntry.twitterTitle||title,
        description:seoEntry.twitterDescription||description,...(ogImage?{images:[ogImage]}:{})}
    };
  }
  const lang=await resolveLang(slug),page=await renderPage(slug,await searchParams);
  const canonical=absolute(normalPath(slug,lang,page));
  const preview=await previewHost();
  const languages=page.post?alternatesForPost(page.post):page.isBlogList?
    Object.fromEntries((await Promise.all((await getWebsiteLocales()).map(async code=>({
      code,count:(await getBlogPosts(code)).length
    })))).filter(x=>x.count>0).map(x=>[x.code,absolute(blogPath(x.code))])):
    Object.fromEntries((await getWebsiteLocales()).filter(code=>!metadataFor(seo,seoPage,code).noindex).map(code=>
      [code,absolute(normalPath(slug,code,page))]
    ));
  const picture=page.post?imageUrl(page.post):undefined;
  const noindex=preview||seo?.allowIndexing===false||seoEntry.noindex===true||page.post?.noIndex===true||slug.some(part=>part==='login'||part==='register'||part==='login.html'||part==='register.html');
  const chosenCanonical=seoEntry.canonicalPath?absolute(seoEntry.canonicalPath):canonical;
  const chosenTitle=seoEntry.title||page.title;
  const chosenDescription=seoEntry.description||page.description;
  const chosenPicture=seoImage(seoEntry.ogImage||picture||seo?.defaultOgImage);
  const generic={
    title:chosenTitle,description:chosenDescription,metadataBase:new URL(BASE),
    alternates:{canonical:chosenCanonical,languages},
    robots:noindex?{index:false,follow:false}:{index:true,follow:true},
    openGraph:{
      title:seoEntry.ogTitle||chosenTitle,description:seoEntry.ogDescription||chosenDescription,url:chosenCanonical,
      siteName:seo?.siteName||'Ticarti',locale:localeLabel[lang]||lang.replace('-','_'),
      ...(chosenPicture?{images:[{url:chosenPicture,alt:page.post?.imageAlt||chosenTitle}]}:{})
    },
    twitter:{card:chosenPicture?'summary_large_image' as const:'summary' as const,title:seoEntry.twitterTitle||chosenTitle,
      description:seoEntry.twitterDescription||chosenDescription,...(chosenPicture?{images:[chosenPicture]}:{})}
  };
  if(page.post){
    return {...generic,openGraph:{...generic.openGraph,type:'article',
      ...(page.post.publishedAt?{publishedTime:page.post.publishedAt}:{}),
      ...(page.post.updatedAt?{modifiedTime:page.post.updatedAt}:{})}} as Metadata;
  }
  return {...generic,openGraph:{...generic.openGraph,type:'website'}} as Metadata;
}
// Pure visual interaction scripts. No database content patching, mock orders,
// runtime HTML replacements or website-home-cms.js.
export default async function MarketingPage({params,searchParams}:Props){
  const {slug=[]}=await params;
  const seo=await getWebsiteSeo();
  const requestPath='/'+slug.join('/');
  const match=seo?.redirects?.find(x=>x.from.replace(/\/$/,'')===requestPath.replace(/\/$/,''));
  if(match&&match.to!==match.from){
    if(match.permanent)permanentRedirect(match.to);
    redirect(match.to);
  }

  if(slug.length===0||(slug.length===1&&(slug[0]==='index.html'||['tr','en','de','ru','ar'].includes(slug[0])))||(slug.length===2&&['tr','en','de','ru','ar'].includes(slug[0])&&slug[1]==='index.html')){
    const locale=slug[0]&&['tr','en','de','ru','ar'].includes(slug[0])?slug[0]:'tr';
    const [home,allPosts]=await Promise.all([getHomeContent(locale),getBlogPosts(locale)]);
    const blogModule=moduleById(home,'blog');
    const categories=blogModule?.categoryIds||[];
    const posts=categories.length?allPosts.filter(p=>p.categoryId&&categories.includes(p.categoryId)):allPosts;
    const faqModule=moduleById(home,'faq');
    const faqItems=(faqModule?.items||[])
      .filter(item=>item.enabled!==false&&textFor(item.fields?.question,locale)&&textFor(item.fields?.answer,locale));
    const faqJsonLd=faqModule?.configured&&faqItems.length?{
      '@context':'https://schema.org','@type':'FAQPage',
      mainEntity:faqItems.map(item=>({
        '@type':'Question',name:textFor(item.fields?.question,locale),
        acceptedAnswer:{'@type':'Answer',text:textFor(item.fields?.answer,locale)}
      }))
    }:null;
    return <>
      <HomeInteractions><HomeSnapshot home={home} posts={posts} locale={locale}/></HomeInteractions>
      {faqJsonLd?<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(faqJsonLd).replace(/</g,'\\u003c')}}/>:null}
    </>;
  }
  const lang=await resolveLang(slug),page=await renderPage(slug,await searchParams);
  const schemas=jsonLd(page,lang);
  if(page.isBlogList){
    return <>
      <BlogArchive posts={page.posts||[]} locale={lang}/>
      <BlogInteractions/>
      {schemas.map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>)}
    </>;
  }
  if(page.post){
    const all=await getBlogPosts(lang),post=page.post;
    const candidates=all.filter(x=>x.id!==post.id);
    const selected=(post.relatedPostIds||[]).map(id=>candidates.find(p=>p.id===id)).filter((p):p is BlogPost=>!!p);
    const related=[...selected,...candidates.filter(p=>!selected.some(x=>x.id===p.id))].slice(0,3);
    return <>
      <BlogArticle post={post} related={related} allPosts={all} locale={lang}/>
      {schemas.map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>)}
    </>;
  }
  return <>
    {page.html.includes("tc-site-header")&&page.html.includes("tc-site-footer")?<SiteShell><div className={page.classes} dangerouslySetInnerHTML={{__html:stripLegacyShell(page.html)}}/></SiteShell>:<div className={page.classes} dangerouslySetInnerHTML={{__html:page.html}}/>}
    {page.isBlogList?<BlogInteractions/>:null}
    <LegacyScripts sources={page.scripts.filter(src=>!/(?:header-navigation|topbar-features)\.js(?:\?|$)/.test(src))} htmlClasses={page.classes}/>
    {schemas.map((schema,i)=><script key={i} type="application/ld+json" dangerouslySetInnerHTML={{
      __html:JSON.stringify(schema).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')
    }}/>)}
  </>;
}
