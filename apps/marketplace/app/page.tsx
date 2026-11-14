import AppMarketplace from '../components/app-marketplace/catalog';
import MarketplaceFaq from '../components/app-marketplace/faq';
import BottomCtaSection from '../components/home-snapshot/bottomCta-cms';
import {getHomeContent} from '../lib/home-cms';

export const dynamic = 'force-dynamic';

export default async function Page() {
 const home=await getHomeContent('tr');
 return <><AppMarketplace/><MarketplaceFaq/><BottomCtaSection home={home} locale="tr"/></>;
}
