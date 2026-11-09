import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import ContactView,{contactLocales,type ContactLocale} from '@/components/contact-view';
type Props={params:Promise<{lang:string}>};
export const dynamic='force-dynamic';
const valid=(lang:string):lang is ContactLocale=>contactLocales.includes(lang as ContactLocale)&&lang!=='tr';
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {lang}=await params;
 if(!valid(lang))return {robots:{index:false}};
 return {title:'Ticarti | Contact',description:'Contact the Ticarti team for questions, requests and partnerships.',
  alternates:{canonical:'https://ticarti.com/'+lang+'/iletisim'},robots:{index:true,follow:true}};
}
export default async function LocalizedContactPage({params}:Props){
 const {lang}=await params;
 if(!valid(lang))notFound();
 return <ContactView locale={lang}/>;
}
