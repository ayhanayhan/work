import type {ReactNode} from 'react';
import {headers} from 'next/headers';
import {getNavigation,menuLocaleFromPath} from '@/lib/navigation';
import HeaderSnapshot from '@/components/home-snapshot/header';
import FooterSnapshot from '@/components/home-snapshot/footer';
import HomeInteractions from '@/components/home-snapshot/interactions';

/** Single shared site shell for all Marketing routes. Never import header/footer HTML from page templates. */
export default async function SiteShell({children}:{children:ReactNode}){
 const locale=menuLocaleFromPath((await headers()).get('x-marketing-page')||'/');
 const nav=await getNavigation(locale);
 return <HomeInteractions className="tc-page-home tc-shared-shell">
   <HeaderSnapshot navigation={nav} locale={locale}/>
   {children}
   <FooterSnapshot navigation={nav} locale={locale}/>
 </HomeInteractions>;
}
