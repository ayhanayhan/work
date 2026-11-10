'use client';
import {useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {useAuthLocale} from './auth-locale';
import {LOGIN_HEADER_HTML,REGISTER_HEADER_HTML,LOGIN_AI_HTML,REGISTER_AI_HTML,LOGIN_LEGAL_HTML,REGISTER_LEGAL_HTML} from './original-template-markup';
export const AUTH_ASSET_ORIGIN='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
export default function AuthShell({children,progress,aiContext}:{children:ReactNode;progress?:number;aiContext?:'login'|'email'|'registerWelcome'|number}){
 const {locale,locales,setLocale,t}=useAuthLocale();
 const originalRegister=typeof progress==='number';
 const sourceHeader=originalRegister?REGISTER_HEADER_HTML:LOGIN_HEADER_HTML;
 // Preserve the original header as the direct flex child: no extra wrapper changes its layout.
 const headerInner=sourceHeader.slice(sourceHeader.indexOf('>')+1,sourceHeader.lastIndexOf('</div>'));
 const headerRef=useRef<HTMLDivElement>(null);
 const[languageOpen,setLanguageOpen]=useState(false);
 const aiTexts:Record<string,string[]> = {
  tr:['Tekrar hoş geldin! Mağazana giriş yaparak ürünlerini, siparişlerini ve tüm operasyonunu kaldığın yerden yönetebilirsin.','E-posta adresin ve şifrenle güvenle devam et. Hesap açman gerekiyorsa kayıt ekranına dönebilirsin.','Ticarti’ye hoş geldin! Hesabını oluşturduktan sonra mağazanı birkaç basit adımda birlikte hazırlayacağız.','Önce seni tanıyalım. Adın, e-posta adresin ve şifren Ticarti hesabının temelini oluşturacak.','Başlangıç için sana uygun paketi seç. Sonraki adımlarda mağazanı hazırlayacağız.','Ne satacağını seç. Bu bilgi başlangıçta sana daha uygun mağaza önerileri sunmamıza yardımcı olacak.','Şimdi markana bir isim verelim. Mağaza adını daha sonra yönetim panelinden değiştirebilirsin.','Mağazan için kısa ve akılda kalıcı bir internet adresi seç. Kendi alan adını sonradan bağlayabileceksin.','Mağaza bilgilerini tamamladın. Son adım olan ödeme özetine geçmeden önce seçimlerini kontrol edebilirsin.','Son adımda paket özetini görüyorsun. Gerçek ödeme, güvenli ödeme sağlayıcısı bağlandıktan sonra etkinleştirilecek.'],
  en:['Welcome back! Sign in to manage your store, orders and operations.','Continue securely with your email and password.','Welcome to Ticarti! We will set up your store together.','First, tell us about yourself to create your account.','Choose a plan that suits your business.','Choose what you plan to sell.','Give your brand a name; you can change it later.','Choose a memorable store address.','Review your details before continuing.','Review your plan; payment will be available when enabled.'],
  de:['Willkommen zurück! Verwalte Shop, Bestellungen und Produkte.','Melde dich sicher mit E-Mail und Passwort an.','Willkommen bei Ticarti! Wir richten deinen Shop gemeinsam ein.','Gib deine persönlichen Kontodaten ein.','Wähle den passenden Tarif.','Was möchtest du verkaufen?','Gib deiner Marke einen Namen.','Wähle eine einprägsame Shopadresse.','Prüfe deine Angaben.','Überprüfe den Tarif vor der Zahlung.'],
  ru:['С возвращением! Управляйте магазином, заказами и товарами.','Войдите с помощью email и пароля.','Добро пожаловать в Ticarti! Настроим магазин вместе.','Сначала заполните данные для аккаунта.','Выберите подходящий тариф.','Укажите, что вы будете продавать.','Придумайте название бренда.','Выберите адрес магазина.','Проверьте данные магазина.','Проверьте тариф перед оплатой.'],
  ar:['مرحبًا بعودتك! أدر متجرك وطلباتك ومنتجاتك.','تابع بأمان باستخدام بريدك وكلمة المرور.','مرحبًا في Ticarti! لنجهز متجرك معًا.','أدخل بيانات حسابك أولاً.','اختر الباقة المناسبة.','اختر ما تخطط لبيعه.','اختر اسم علامتك التجارية.','اختر عنوانًا لمتجرك.','راجع بيانات المتجر.','راجع الباقة قبل الدفع.'],
  bg:['Добре дошли отново! Управлявайте магазина и поръчките си.','Влезте сигурно с имейл и парола.','Добре дошли в Ticarti! Нека настроим магазина ви.','Въведете данните за акаунта си.','Изберете подходящ план.','Какво ще продавате?','Изберете име на марката.','Изберете адрес на магазина.','Прегледайте данните си.','Прегледайте плана преди плащане.'],
  uk:['З поверненням! Керуйте магазином, товарами й замовленнями.','Увійдіть через email і пароль.','Вітаємо в Ticarti! Налаштуймо магазин разом.','Заповніть дані для акаунта.','Оберіть тариф.','Що ви плануєте продавати?','Оберіть назву бренду.','Виберіть адресу магазину.','Перевірте налаштування.','Перегляньте тариф перед оплатою.'],
  id:['Selamat datang kembali! Kelola toko, pesanan dan produkmu.','Masuk dengan email dan kata sandi.','Selamat datang di Ticarti! Mari atur tokomu.','Masukkan detail akunmu terlebih dahulu.','Pilih paket yang sesuai.','Pilih produk yang akan dijual.','Beri nama merekmu.','Pilih alamat toko.','Periksa informasi toko.','Tinjau paket sebelum pembayaran.'],
  vi:['Chào mừng trở lại! Quản lý cửa hàng, đơn hàng và sản phẩm.','Đăng nhập an toàn bằng email và mật khẩu.','Chào mừng đến Ticarti! Hãy cùng thiết lập cửa hàng.','Nhập thông tin tài khoản trước tiên.','Chọn gói phù hợp.','Chọn mặt hàng bạn sẽ bán.','Đặt tên thương hiệu.','Chọn địa chỉ cửa hàng.','Kiểm tra thông tin.','Xem lại gói trước khi thanh toán.']
 };
 const list=aiTexts[locale]||aiTexts.tr;
 const contextIndex=typeof aiContext==='number'?Math.min(9,Math.max(3,aiContext+3)):aiContext==='email'?1:originalRegister?2:0;
 const aiMessage=list[contextIndex];
 const aiSource=originalRegister?REGISTER_AI_HTML:LOGIN_AI_HTML;
 const localizedAi=aiSource.replace('<p class="tc-mobile-ai-message" id="tc-mobile-ai-message"></p>','<p class="tc-mobile-ai-message" id="tc-mobile-ai-message">'+aiMessage+'</p>');
 const localHeader=headerInner.replace(/(<span data-slot="select-value">)[^<]*/,'$1'+locale.toUpperCase());
 function handleHeaderClick(e:MouseEvent<HTMLDivElement>){
  if((e.target as Element).closest('button[aria-label="Change language"]')){e.preventDefault();setLanguageOpen(x=>!x);}
 }
 return <>
  <div id="root" className="tc-auth-source" lang={locale}>
   <div className="tc-auth-shell-shell-viewport fixed inset-0 overflow-clip">
    <div className="tc-auth-shell-shell-root flex h-full w-full overflow-x-auto bg-[color-mix(in_srgb,var(--color-sh-lime-100)_40%,var(--background))]">
     <div className="tc-auth-shell-shell-content-col flex h-full min-h-0 min-w-[778px] flex-1 flex-col bg-background tc-auth-content-width">
      <div className="tc-auth-shell-progress-header flex w-full shrink-0 items-center justify-between px-8 pt-8" ref={headerRef} onClick={handleHeaderClick} dangerouslySetInnerHTML={{__html:localHeader}}/>
      {languageOpen?<div className="tc-auth-source-lang" role="listbox" aria-label={t('localeLabel')}>{locales.map(x=><button type="button" key={x.locale} role="option" aria-selected={x.locale===locale} onClick={()=>{setLocale(x.locale);setLanguageOpen(false)}}>{x.label} · {x.locale.toUpperCase()}{x.locale===locale?' ✓':''}</button>)}</div>:null}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] tc-auth-scroll-spacer"><div className="tc-auth" id="tc-app">{children}</div></div>
     </div>
    </div>
   </div>
   <div dangerouslySetInnerHTML={{__html:localizedAi}}/>
   <div dangerouslySetInnerHTML={{__html:originalRegister?REGISTER_LEGAL_HTML:LOGIN_LEGAL_HTML}}/>
  </div>
 </>;
}
