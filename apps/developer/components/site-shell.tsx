import type {ReactNode} from 'react';
import {getNavigation} from '@/lib/navigation';
import {getPlatformLogoForHost} from '@/lib/subdomain-branding';
import HeaderSnapshot from '@/components/home-snapshot/header';
import FooterSnapshot from '@/components/home-snapshot/footer';
import HomeInteractions from '@/components/home-snapshot/interactions';

const MARKETING_ASSETS='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
const API_ORIGIN=(process.env.API_ORIGIN||'').replace(/\/$/,'');
function publicLogo(src:string){
 if(!src.startsWith('/')||src.startsWith('//'))return src;
 if(src.startsWith('/v1/'))return src;
 if(src.startsWith('/assets/'))return MARKETING_ASSETS+src;
 return API_ORIGIN?API_ORIGIN+src:MARKETING_ASSETS+src;
}
export default async function SiteShell({children}:{children:ReactNode}){
 const locale='tr';
 const [logoSrc,nav]=await Promise.all([getPlatformLogoForHost('dev.ticarti.com'),getNavigation(locale)]);
 const relocate=(url:string)=>{
  if(!url||!url.startsWith('/')||url.startsWith('//'))return url;
  if(url==='/yardim'||url==='/yardim/')return 'https://help.ticarti.com/';
  return 'https://ticarti.com'+url;
 };
 const node=(item:any):any=>({...item,url:relocate(item.url),
  featured:item.featured?{...item.featured,buttonUrl:relocate(item.featured.buttonUrl)}:undefined,
  children:Array.isArray(item.children)?item.children.map(node):[]});
 const scopedNav=nav?{...nav,
  menus:nav.menus?{header:nav.menus.header.map(node),footer:nav.menus.footer.map(node)}:undefined,
  groups:nav.groups?.map(group=>({...group,links:group.links.map(link=>({...link,url:relocate(link.url)}))}))
 }:null;
 const items=[
  {id:'dev-home',label:{tr:'Başlangıç'},url:'/',enabled:true,children:[]},
  {id:'dev-docs',label:{tr:'Dokümantasyon'},url:'/docs',enabled:true,children:[]},
  {id:'dev-api',label:{tr:'API referansı'},url:'/docs/api',enabled:true,children:[]},
  {id:'dev-apps',label:{tr:'Uygulamalarım'},url:'/apps',enabled:true,children:[]},
  {id:'dev-themes',label:{tr:'Tema geliştirme'},url:'/docs/themes',enabled:true,children:[]}
 ];
 const devHeaderNav={version:scopedNav?.version||0,menus:{
  header:items,
  footer:scopedNav?.menus?.footer||[]
 }};
 const devFooterNav={...(scopedNav||{version:0}),menus:{
  header:[],
  footer:[...(scopedNav?.menus?.footer||[]),{
   id:'developer-footer',label:{tr:'Geliştirici'},url:'',enabled:true,
   children:[
    {id:'developer-footer-docs',label:{tr:'Dokümantasyon'},url:'/docs',enabled:true,children:[]},
    {id:'developer-footer-apps',label:{tr:'Uygulamalarım'},url:'/apps',enabled:true,children:[]},
    {id:'developer-footer-guide',label:{tr:'Başlangıç'},url:'/guide',enabled:true,children:[]}
   ]
  }]
 }};
 return <HomeInteractions className="tc-page-home tc-shared-shell tc-developer-shell">
  <HeaderSnapshot navigation={devHeaderNav} locale={locale} helpHost logoSrc={publicLogo(logoSrc)}/>
  {children}
  <FooterSnapshot navigation={devFooterNav} locale={locale} helpHost logoSrc={publicLogo(logoSrc)}/>
 </HomeInteractions>;
}
