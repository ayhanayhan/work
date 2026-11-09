import SiteShell from '@/components/site-shell';
import ContactForm from '@/components/contact-form';

export const contactLocales=['tr','en','de','ru','ar','bg','uk','id','vi'] as const;
export type ContactLocale=typeof contactLocales[number];
const copy:Record<ContactLocale,{eyebrow:string,title:string,description:string,note:string}>={
 tr:{eyebrow:'TİCARTİ · İLETİŞİM',title:'Ticarti ile iletişime geçin.',description:'Sorularınızı yanıtlamak, fikirlerinizi dinlemek ve işinizi büyütmenize yardımcı olmak için buradayız.',note:'Ticarti hakkında merak ettikleriniz, iş birliği önerileriniz veya diğer talepleriniz için formu doldurun. Mesajınız doğrudan ekibimize ulaşır.'},
 en:{eyebrow:'TICARTI · CONTACT',title:'Let’s talk.',description:'Questions, partnership requests or suggestions about Ticarti? Send us a message. Our team is here to help.',note:'Your message will be securely recorded and reviewed by our team.'},
 de:{eyebrow:'TICARTI · KONTAKT',title:'Sprechen wir miteinander.',description:'Haben Sie Fragen, Partnerschaftsanfragen oder Vorschläge zu Ticarti? Schreiben Sie uns.',note:'Ihre Nachricht wird sicher gespeichert und von unserem Team geprüft.'},
 ru:{eyebrow:'TICARTI · КОНТАКТЫ',title:'Давайте поговорим.',description:'Есть вопросы или предложения о Ticarti? Напишите нам, и наша команда свяжется с вами.',note:'Ваше сообщение будет надёжно сохранено и рассмотрено нашей командой.'},
 ar:{eyebrow:'TICARTI · اتصل بنا',title:'لنتحدث معاً.',description:'لديك أسئلة أو اقتراحات أو طلبات شراكة بخصوص Ticarti؟ أرسل لنا رسالة.',note:'سيتم حفظ رسالتك بأمان ومراجعتها من قبل فريقنا.'},
 bg:{eyebrow:'TICARTI · КОНТАКТ',title:'Нека поговорим.',description:'Имате въпроси или предложения за Ticarti? Пишете ни и нашият екип ще ви отговори.',note:'Съобщението ви ще бъде съхранено сигурно и разгледано.'},
 uk:{eyebrow:'TICARTI · КОНТАКТИ',title:'Поговорімо.',description:'Маєте запитання чи пропозиції щодо Ticarti? Напишіть нам, і команда відповість.',note:'Ваше повідомлення буде безпечно збережене та розглянуте.'},
 id:{eyebrow:'TICARTI · KONTAK',title:'Mari berbicara.',description:'Punya pertanyaan, usulan, atau permintaan kerja sama tentang Ticarti? Hubungi tim kami.',note:'Pesan Anda disimpan dengan aman untuk ditinjau oleh tim kami.'},
 vi:{eyebrow:'TICARTI · LIÊN HỆ',title:'Hãy trò chuyện.',description:'Bạn có câu hỏi, đề xuất hoặc yêu cầu hợp tác với Ticarti? Hãy gửi tin nhắn cho chúng tôi.',note:'Tin nhắn của bạn được lưu trữ an toàn và được đội ngũ xem xét.'}
};
export default function ContactView({locale='tr'}:{locale?:ContactLocale}){
 const t=copy[locale];
 return <SiteShell>
  <main className="tc-contact-native">
   <div className="tc-contact-native__layout">
    <section className="tc-contact-native__intro">
     <p className="tc-contact-native__overline">{t.eyebrow}</p>
     <h1>{t.title}</h1>
     <p>{t.description}</p>
     <div className="tc-contact-native__note"><span aria-hidden="true">↗</span><span>{t.note}</span></div>
    </section>
    <ContactForm locale={locale}/>
   </div>
  </main>
 </SiteShell>;
}
