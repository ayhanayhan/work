import type {Metadata} from 'next';
import {headers} from 'next/headers';
import SiteShell from '@/components/site-shell';

export const metadata:Metadata={title:'Sayfa bulunamadı | Ticarti',robots:{index:false,follow:false}};
const copy:Record<string,{eyebrow:string,title:string,description:string,home:string,contact:string,helper:string}> = {
 tr:{eyebrow:'404 · SAYFA BULUNAMADI',title:'Aradığınız sayfa burada değil.',description:'Bağlantı değişmiş veya bu sayfa kaldırılmış olabilir. Ticarti ile devam etmek için ana sayfaya dönebilir ya da bize ulaşabilirsiniz.',home:'Ana sayfaya dön',contact:'Bize ulaşın',helper:'Bir konuda yardıma mı ihtiyacınız var?'},
 en:{eyebrow:'404 · PAGE NOT FOUND',title:'We couldn’t find that page.',description:'The link may have changed or the page may have been removed. Head back home or contact our team.',home:'Back to homepage',contact:'Contact us',helper:'Need a hand?'},
 de:{eyebrow:'404 · SEITE NICHT GEFUNDEN',title:'Diese Seite gibt es hier nicht.',description:'Der Link wurde möglicherweise geändert. Zurück zur Startseite oder kontaktieren Sie uns.',home:'Zur Startseite',contact:'Kontakt',helper:'Benötigen Sie Hilfe?'},
 ru:{eyebrow:'404 · СТРАНИЦА НЕ НАЙДЕНА',title:'Эта страница не найдена.',description:'Возможно, ссылка изменилась. Вернитесь на главную или свяжитесь с нами.',home:'На главную',contact:'Связаться',helper:'Нужна помощь?'},
 ar:{eyebrow:'404 · الصفحة غير موجودة',title:'لم نعثر على هذه الصفحة.',description:'ربما تغير الرابط أو حُذفت الصفحة. عد إلى الرئيسية أو تواصل معنا.',home:'الصفحة الرئيسية',contact:'تواصل معنا',helper:'هل تحتاج إلى مساعدة؟'},
 bg:{eyebrow:'404 · СТРАНИЦАТА НЕ Е НАМЕРЕНА',title:'Страницата не е намерена.',description:'Възможно е адресът да е променен. Върнете се към началото или се свържете с нас.',home:'Начална страница',contact:'Свържете се с нас',helper:'Нуждаете се от помощ?'},
 uk:{eyebrow:'404 · СТОРІНКУ НЕ ЗНАЙДЕНО',title:'Не вдалося знайти сторінку.',description:'Посилання могло змінитися. Перейдіть на головну або зв’яжіться з нами.',home:'На головну',contact:'Зв’язатися',helper:'Потрібна допомога?'},
 id:{eyebrow:'404 · HALAMAN TIDAK DITEMUKAN',title:'Halaman tidak ditemukan.',description:'Tautan mungkin sudah berubah. Kembali ke beranda atau hubungi tim kami.',home:'Kembali ke beranda',contact:'Hubungi kami',helper:'Butuh bantuan?'},
 vi:{eyebrow:'404 · KHÔNG TÌM THẤY TRANG',title:'Không tìm thấy trang này.',description:'Liên kết có thể đã thay đổi. Hãy về trang chủ hoặc liên hệ với chúng tôi.',home:'Về trang chủ',contact:'Liên hệ',helper:'Bạn cần trợ giúp?'}
};
export default async function NotFound(){
 const path=(await headers()).get('x-marketing-page')||'/';
 const locale=path.match(/^\/(tr|en|de|ru|ar|bg|uk|id|vi)(?:\/|$)/)?.[1]||'tr';
 const t=copy[locale]||copy.tr;
 const prefix=locale==='tr'?'':'/'+locale;
 return <SiteShell>
  <main className="tc-not-found">
   <div className="tc-not-found__inner">
    <div className="tc-not-found__content">
     <p className="tc-not-found__eyebrow">{t.eyebrow}</p>
     <h1>{t.title}</h1>
     <p className="tc-not-found__description">{t.description}</p>
     <div className="tc-not-found__actions">
      <a className="tc-not-found__primary" href={prefix+'/'}>{t.home}<span aria-hidden="true">↗</span></a>
      <a className="tc-not-found__secondary" href={prefix+'/contacto.html'}>{t.contact}</a>
     </div>
     <p className="tc-not-found__helper">{t.helper} <a href={prefix+'/contacto.html'}>{t.contact} <span aria-hidden="true">→</span></a></p>
    </div>
    <div className="tc-not-found__visual" aria-hidden="true"><span className="tc-not-found__number">404</span><span className="tc-not-found__visual-line"/></div>
   </div>
  </main>
 </SiteShell>;
}
