import SiteShell from '@/components/site-shell';
import ContactForm from '@/components/contact-form';
import type {Metadata} from 'next';

export const dynamic='force-dynamic';
export const metadata:Metadata={
 title:'İletişim | Ticarti',description:'Ticarti ekibine ulaşın. Sorularınızı, taleplerinizi ve iş birliği önerilerinizi iletişim formuyla bize iletin.',
 alternates:{canonical:'https://ticarti.com/iletisim'},
 robots:{index:true,follow:true}
};

export default function ContactPage(){
 return <SiteShell>
  <main className="tc-contact-native">
   <div className="tc-contact-native__layout">
    <section className="tc-contact-native__intro">
     <p className="tc-contact-native__overline">TİCARTİ · İLETİŞİM</p>
     <h1>Birlikte konuşalım.</h1>
     <p>Ticarti ile ilgili sorularınız, iş ortaklığı talepleriniz veya önerileriniz için bize yazın. Mesajınız doğrudan ekibimize ulaşsın.</p>
     <div className="tc-contact-native__note"><span aria-hidden="true">↗</span><span>Formdan gelen tüm mesajları güvenli biçimde kaydediyor ve ekibimiz tarafından değerlendiriyoruz.</span></div>
    </section>
    <ContactForm/>
   </div>
  </main>
 </SiteShell>;
}
