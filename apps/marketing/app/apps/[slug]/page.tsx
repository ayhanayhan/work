import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';
import AppDetail from '@/components/app-marketplace/detail';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Uygulama Detayları | Ticarti App Store'};
export default function Page(){return <SiteShell><AppDetail/></SiteShell>}
