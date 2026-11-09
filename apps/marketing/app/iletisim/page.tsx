import type {Metadata} from 'next';
import ContactView from '@/components/contact-view';
import {getWebsiteSeo,metadataFor} from '@/lib/site-seo';
export const dynamic='force-dynamic';
export async function generateMetadata():Promise<Metadata>{
 const seo=await getWebsiteSeo(),data=metadataFor(seo,'contact','tr');
 return {
  title:data.title||'İletişim | Ticarti',
  description:data.description||'Ticarti ekibine ulaşın. Sorularınızı, taleplerinizi ve iş birliği önerilerinizi bize iletin.',
  alternates:{canonical:'https://ticarti.com/iletisim'},
  robots:seo?.allowIndexing===false||data.noindex?{index:false,follow:false}:{index:true,follow:true}
 };
}
export default function ContactPage(){return <ContactView locale="tr"/>;}
