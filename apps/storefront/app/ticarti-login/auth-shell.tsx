'use client';
import {useEffect,useRef,useState,type ReactNode,type MouseEvent} from 'react';
import {LOGIN_HEADER_HTML,REGISTER_HEADER_HTML,LOGIN_AI_HTML,REGISTER_AI_HTML,LOGIN_LEGAL_HTML,REGISTER_LEGAL_HTML} from './original-template-markup';
export const AUTH_ASSET_ORIGIN='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
export default function AuthShell({children,progress,locale='tr',aiContext}:{children:ReactNode;progress?:number;locale?:'tr'|'en';aiContext?:'login'|'email'|'registerWelcome'|number}){
 const originalRegister=typeof progress==='number';
 const sourceHeader=originalRegister?REGISTER_HEADER_HTML:LOGIN_HEADER_HTML;
 // Preserve the original header as the direct flex child: no extra wrapper changes its layout.
 const headerInner=sourceHeader.slice(sourceHeader.indexOf('>')+1,sourceHeader.lastIndexOf('</div>'));
 const headerRef=useRef<HTMLDivElement>(null),aiRef=useRef<HTMLDivElement>(null);
 const[languageOpen,setLanguageOpen]=useState(false);
 useEffect(()=>{document.documentElement.classList.add('tc-page-auth');document.body.classList.add('tc-auth-page');return()=>{document.documentElement.classList.remove('tc-page-auth');document.body.classList.remove('tc-auth-page')}},[]);
 useEffect(()=>{
  const el=headerRef.current;
  const bar=el?.querySelector<HTMLElement>('.tc-auth-shell-progress-track');
  const fill=el?.querySelector<HTMLElement>('.tc-auth-shell-progress-fill');
  if(bar)bar.hidden=!originalRegister;
  if(fill)fill.style.width=String(progress||0)+'%';
 },[progress,originalRegister]);
 useEffect(()=>{
  const message=aiRef.current?.querySelector<HTMLElement>('#tc-mobile-ai-message');
  const steps=[
   'Önce seni tanıyalım. Adın, e-posta adresin ve şifren Ticarti hesabının temelini oluşturacak.',
   'Başlangıç için sana uygun paketi seç. Sonraki adımlarda mağazanı hazırlayacağız.',
   'Ne satacağını seç. Bu bilgi başlangıçta sana daha uygun mağaza önerileri sunmamıza yardımcı olacak.',
   'Şimdi markana bir isim verelim. Mağaza adını daha sonra yönetim panelinden değiştirebilirsin.',
   'Mağazan için kısa ve akılda kalıcı bir internet adresi seç. Kendi alan adını sonradan bağlayabileceksin.',
   'Mağaza bilgilerini tamamladın. Son adım olan ödeme özetine geçmeden önce seçimlerini kontrol edebilirsin.',
   'Son adımda paket özetini görüyorsun. Gerçek ödeme, güvenli ödeme sağlayıcısı bağlandıktan sonra etkinleştirilecek.'
  ];
  if(message)message.textContent=typeof aiContext==='number'?steps[aiContext]||steps[0]:
    aiContext==='email'?'E-posta adresin ve şifrenle güvenle devam et. Hesap açman gerekiyorsa kayıt ekranına dönebilirsin.':
    originalRegister?'Ticarti’ye hoş geldin! Hesabını oluşturduktan sonra mağazanı birkaç basit adımda birlikte hazırlayacağız.':
    'Tekrar hoş geldin! Mağazana giriş yaparak ürünlerini, siparişlerini ve tüm operasyonunu kaldığın yerden yönetebilirsin.';
 },[originalRegister,aiContext]);
 function handleHeaderClick(e:MouseEvent<HTMLDivElement>){
  if((e.target as Element).closest('button[aria-label="Change language"]')){e.preventDefault();setLanguageOpen(x=>!x);}
 }
 return <>
  <link rel="stylesheet" href={AUTH_ASSET_ORIGIN+'/assets/css/style.css?v=v2-pricing-payment-footer-1104'}/>
  <div id="root" className="tc-auth-source" lang={locale}>
   <div className="tc-auth-shell-shell-viewport fixed inset-0 overflow-clip">
    <div className="tc-auth-shell-shell-root flex h-full w-full overflow-x-auto bg-[color-mix(in_srgb,var(--color-sh-lime-100)_40%,var(--background))]">
     <div className="tc-auth-shell-shell-content-col flex h-full min-h-0 min-w-[778px] flex-1 flex-col bg-background tc-auth-content-width">
      <div className="tc-auth-shell-progress-header flex w-full shrink-0 items-center justify-between px-8 pt-8" ref={headerRef} onClick={handleHeaderClick} dangerouslySetInnerHTML={{__html:headerInner}}/>
      {languageOpen?<div className="tc-auth-source-lang"><button type="button" onClick={()=>setLanguageOpen(false)}>Türkçe · TR</button><button type="button" onClick={()=>setLanguageOpen(false)}>English · EN</button></div>:null}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] tc-auth-scroll-spacer"><div className="tc-auth" id="tc-app">{children}</div></div>
     </div>
    </div>
   </div>
   <div ref={aiRef} dangerouslySetInnerHTML={{__html:originalRegister?REGISTER_AI_HTML:LOGIN_AI_HTML}}/>
   <div dangerouslySetInnerHTML={{__html:originalRegister?REGISTER_LEGAL_HTML:LOGIN_LEGAL_HTML}}/>
  </div>
 </>;
}
