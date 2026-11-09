import type {Metadata} from 'next';
import ContactView from '@/components/contact-view';
export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'İletişim | Ticarti',
 description:'Ticarti ekibine ulaşın. Sorularınızı, taleplerinizi ve iş birliği önerilerinizi bize iletin.',
 alternates:{canonical:'https://ticarti.com/iletisim'},
 robots:{index:true,follow:true}
};
export default function ContactPage(){return <ContactView locale="tr"/>;}
