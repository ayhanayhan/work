import type {ReactNode} from 'react';

export const AUTH_ASSET_ORIGIN='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
const texts={
 tr:{legal:'Yasal bağlantılar',terms:'Üyelik Sözleşmesi',privacy:'Gizlilik Politikası',kvkk:'KVKK Aydınlatma Metni',back:'Ana sayfa',lang:'Dil'},
 en:{legal:'Legal links',terms:'Membership Agreement',privacy:'Privacy Policy',kvkk:'Data Protection Notice',back:'Homepage',lang:'Language'}
};
export default function AuthShell({children,locale='tr',progress}:{children:ReactNode;locale?:'tr'|'en';progress?:number}){
 const t=texts[locale];
 return <main className="tc-next-auth tc-auth-shell-shell-viewport" lang={locale}>
  <div className="tc-auth-shell-shell-root">
   <div className="tc-auth-shell-shell-content-col">
    <header className="tc-auth-shell-progress-header">
     <a className="tc-auth-home-link" href="https://ticarti.com/" aria-label="Ticarti ana sayfa">
      <img className="tc-logo-original" src={AUTH_ASSET_ORIGIN+'/assets/images/ticarti-logo.svg'} alt="Ticarti"/>
     </a>
     <div className="tc-auth-shell-header-actions">
      {typeof progress==='number'?<div className="tc-auth-shell-progress-track" role="progressbar" aria-label="Kayıt ilerlemesi" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="tc-auth-shell-progress-fill" style={{width:progress+'%'}}/></div>:null}
      <span className="tc-auth-language-label">TR</span>
     </div>
    </header>
    <div className="tc-auth-shell-form-scroll">
     <div className="tc-auth" id="tc-app">{children}</div>
    </div>
    <footer className="tc-auth-legal-footer" aria-label={t.legal}>
     <nav aria-label={t.legal}>
      <a href="https://ticarti.com/uyelik-sozlesmesi.html" target="_blank" rel="noopener noreferrer">{t.terms}</a>
      <a href="https://ticarti.com/gizlilik-politikasi.html" target="_blank" rel="noopener noreferrer">{t.privacy}</a>
      <a href="https://ticarti.com/kvkk.html" target="_blank" rel="noopener noreferrer">{t.kvkk}</a>
     </nav>
    </footer>
   </div>
  </div>
 </main>;
}
