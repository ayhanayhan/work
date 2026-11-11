import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import AppMarketplace from '@/components/app-marketplace/catalog';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Ticarti Uygulama Mağazası',description:'Ticarti uygulamalarını keşfedin. Kargo, muhasebe, pazarlama ve ödeme entegrasyonları.'};
export default function Page(){return <SiteShell><AppMarketplace/></SiteShell>}
