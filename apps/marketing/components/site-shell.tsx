import type {ReactNode} from 'react';
import HeaderSnapshot from '@/components/home-snapshot/header';
import FooterSnapshot from '@/components/home-snapshot/footer';
import HomeInteractions from '@/components/home-snapshot/interactions';

/** Single shared site shell for all Marketing routes. Never import header/footer HTML from page templates. */
export default function SiteShell({children}:{children:ReactNode}){
 return <HomeInteractions className="tc-shared-shell">
   <HeaderSnapshot/>
   {children}
   <FooterSnapshot/>
 </HomeInteractions>;
}
