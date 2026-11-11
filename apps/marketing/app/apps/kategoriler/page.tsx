import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import Categories from '@/components/app-marketplace/categories';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Uygulama Kategorileri | Ticarti',description:'Ticarti App Store uygulama kategorileri, popüler ve yeni uygulamalar.'};
export default function Page(){return <SiteShell><Categories/></SiteShell>}
