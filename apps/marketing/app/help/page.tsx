import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import HelpCenter from '@/components/help-center';
import {getHelpTopics} from '@/lib/help-cms';

export const metadata:Metadata={
 title:'Yardım Merkezi | Ticarti',
 description:'Ticarti mağaza kurulumu, ürünler, siparişler, ödeme, kargo ve diğer konularda yardım alın.',
 alternates:{canonical:'https://help.ticarti.com/'}
};

export const dynamic='force-dynamic';
export default async function HelpPage(){
 const topics=await getHelpTopics();
 return <SiteShell><HelpCenter locale="tr" topics={topics}/></SiteShell>;
}
