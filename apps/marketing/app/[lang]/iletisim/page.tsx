import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import ContactView,{contactLocales,type ContactLocale} from '@/components/contact-view';
import {getWebsiteSeo,metadataFor} from '@/lib/site-seo';
type Props={params:Promise<{lang:string}>};
export const dynamic='force-dynamic';
const valid=(lang:string):lang is ContactLocale=>contactLocales.includes(lang as ContactLocale)&&lang!=='tr';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {lang}=await params;
 if(!valid(lang))return {robots:{index:false}};
 const seo=await getWebsiteSeo(),data=metadataFor(seo,'contact',lang);
 return {title:data.title||'Ticarti | Contact',
  description:data.description||'Contact the Ticarti team for questions, requests and partnerships.',
  alternates:{canonical:'https://ticarti.com/'+lang+'/iletisim'},
  robots:seo?.allowIndexing===false||data.noindex?{index:false,follow:false}:{index:true,follow:true}};
}
export default async function LocalizedContactPage({params}:Props){
 const {lang}=await params;
 if(!valid(lang))notFound();
 return <ContactView locale={lang}/>;
}
