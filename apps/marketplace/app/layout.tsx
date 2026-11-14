import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {getNavigation,menuTree,type MenuNode} from '../lib/navigation';
import HeaderSnapshot from '../components/home-snapshot/header';
import FooterSnapshot from '../components/home-snapshot/footer';
import HomeInteractions from '../components/home-snapshot/interactions';
import './globals.css';
import './marketplace.css';

export const metadata:Metadata={
  title:'Ticarti Uygulama Mağazası',
  description:'Ticarti uygulamalarını keşfedin. Kargo, muhasebe, pazarlama ve ödeme entegrasyonları.',
  alternates:{canonical:'https://apps.ticarti.com/'},
};

// Match the original Marketing SiteShell: external site links stay on ticarti.com,
// while Marketplace pages remain native routes under apps.ticarti.com.
function relocate(node:MenuNode):MenuNode{
  const url=(u:string)=>{
    if(!u||!u.startsWith('/'))return u;
    if(u==='/yardim'||u==='/yardim/')return 'https://help.ticarti.com/';
    return 'https://ticarti.com'+u;
  };
  return {...node,url:url(node.url),featured:node.featured?{...node.featured,buttonUrl:url(node.featured.buttonUrl)}:undefined,
    children:Array.isArray(node.children)?node.children.map(relocate):[]};
}

export default async function RootLayout({children}:{children:ReactNode}){
 const nav=await getNavigation('tr');
 const menu=menuTree(nav);
 const item=(id:string,label:string,url:string):MenuNode=>({id,label:{tr:label},url,enabled:true,children:[]});
 const navigation={...nav,menus:{
   header:[
     item('marketplace-home','Uygulamalar','/'),
     item('marketplace-categories','Kategoriler','/kategoriler'),
     item('marketplace-popular','En çok indirilenler','/kategoriler?sort=popular'),
     item('marketplace-newest','Son eklenenler','/kategoriler?sort=newest'),
   ],
   footer:menu.footer.map(relocate),
 }};
 const logoSrc='/assets/images/ticarti-logo.svg';
 return <html lang="tr" className="tc-page-home tc-page-app"><head>
   <link rel="stylesheet" href="/assets/css/style.css"/>
   <link rel="stylesheet" href="/assets/css/shared-footer.css"/>
   <link rel="stylesheet" href="/assets/css/navigation-tree.css"/>
 </head><body>
  <HomeInteractions className="tc-page-home tc-shared-shell tc-app-surface">
   <HeaderSnapshot navigation={navigation} locale="tr" helpHost logoSrc={logoSrc}/>
   {children}
   <FooterSnapshot navigation={navigation} locale="tr" helpHost logoSrc={logoSrc}/>
  </HomeInteractions>
 </body></html>;
}
