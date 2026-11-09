import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import HelpCenter from '@/components/help-center';

export const metadata:Metadata={
 title:'Yardım Merkezi | Ticarti',
 description:'Ticarti mağaza kurulumu, ürünler, siparişler, ödeme, kargo ve diğer konularda yardım alın.',
 alternates:{canonical:'https://ticarti.com/yardim'}
};

export default function HelpPage(){
 return <SiteShell><HelpCenter locale="tr"/></SiteShell>;
}
