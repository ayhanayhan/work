import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {getNavigation,menuLocaleFromPath} from '@/lib/navigation';
import HeaderSnapshot from '@/components/home-snapshot/header';
import FooterSnapshot from '@/components/home-snapshot/footer';
import HomeInteractions from '@/components/home-snapshot/interactions';
import {logoForHost} from '@/lib/subdomain-branding';

/** Single shared site shell for all Marketing routes. Never import header/footer HTML from page templates. */
export default async function SiteShell({children}:{children:ReactNode}){
 const requestHeaders=await headers();
 const locale=menuLocaleFromPath(requestHeaders.get('x-marketing-page')||'/');
 const helpHost=requestHeaders.get('x-ticarti-help-host')==='1';
 const logoSrc=logoForHost(helpHost?'help.ticarti.com':(requestHeaders.get('host')||'ticarti.com'));
 const nav=await getNavigation(locale);
 const relocate=(url:string)=>{
  if(!helpHost||!url||!url.startsWith('/'))return url;
  if(url==='/yardim'||url==='/yardim/')return 'https://help.ticarti.com/';
  return 'https://ticarti.com'+url;
 };
 const node=(item:any):any=>({...item,url:relocate(item.url),
  featured:item.featured?{...item.featured,buttonUrl:relocate(item.featured.buttonUrl)}:undefined,
  children:Array.isArray(item.children)?item.children.map(node):[]});
 const scopedNav=helpHost&&nav?{...nav,
  menus:nav.menus?{header:nav.menus.header.map(node),footer:nav.menus.footer.map(node)}:undefined,
  groups:nav.groups?.map(group=>({...group,links:group.links.map(link=>({...link,url:relocate(link.url)}))}))
 }:nav;
 return <HomeInteractions className="tc-page-home tc-shared-shell">
   <HeaderSnapshot navigation={scopedNav} locale={locale} helpHost={helpHost} logoSrc={logoSrc}/>
   {children}
   <FooterSnapshot navigation={scopedNav} locale={locale} helpHost={helpHost} logoSrc={logoSrc}/>
 </HomeInteractions>;
}
