'use client';
import {useState,type ReactNode} from 'react';

/* Static illustration retained from the user's original marketing login.html. */
const TICAI_ORIGINAL_SVG=`<svg aria-label="TicAi, the Ticarti AI Coach" class="alma-canvas" role="img" viewbox="-26 -16 177 144"><defs><radialgradient cx="0.2" cy="0.35" gradientunits="objectBoundingBox" id="alma-lobe-right-_r_7_" r="1.15"><stop offset="0" stop-color="var(--alma-tint-hi)"></stop><stop offset="0.4" stop-color="var(--alma-tint-hi)"></stop><stop offset="1" stop-color="var(--alma-tint-lo)"></stop></radialgradient><radialgradient cx="0.7" cy="0.25" gradientunits="objectBoundingBox" id="alma-lobe-top-_r_7_" r="1.15"><stop offset="0" stop-color="var(--alma-tint-hi)"></stop><stop offset="0.25" stop-color="var(--alma-tint-hi)"></stop><stop offset="1" stop-color="var(--alma-tint-lo)"></stop></radialgradient><radialgradient cx="0.4" cy="0.15" gradientunits="objectBoundingBox" id="alma-lobe-bottom-_r_7_" r="0.95"><stop offset="0" stop-color="var(--alma-tint-hi)"></stop><stop offset="0.55" stop-color="var(--alma-tint-hi)"></stop><stop offset="1" stop-color="var(--alma-tint-lo)"></stop></radialgradient><radialgradient cx="0.8" cy="0.35" gradientunits="objectBoundingBox" id="alma-lobe-left-_r_7_" r="1.05"><stop offset="0" stop-color="var(--alma-tint-hi)"></stop><stop offset="0.4" stop-color="var(--alma-tint-hi)"></stop><stop offset="1" stop-color="var(--alma-tint-lo)"></stop></radialgradient><lineargradient gradientunits="userSpaceOnUse" id="alma-bubble-_r_7_" x1="114" x2="150" y1="21" y2="-15"><stop offset="0" stop-color="var(--alma-thought-lo)"></stop><stop offset="1" stop-color="var(--alma-thought-hi)"></stop></lineargradient><lineargradient id="alma-eye-_r_7_" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--alma-tint-eye)" stop-opacity="1"></stop><stop offset="0.5" stop-color="var(--alma-tint-eye)" stop-opacity="0.7"></stop><stop offset="1" stop-color="var(--alma-tint-eye)" stop-opacity="0.33"></stop></lineargradient></defs><g class="alma-speech"><g class="alma-body"><circle class="alma-lobe tc-auth-alma-lobe-1" cx="101.5" cy="57.5" fill="url(#alma-lobe-right-_r_7_)" r="22.5"></circle><circle class="alma-lobe tc-auth-alma-lobe-2" cx="69" cy="34" fill="url(#alma-lobe-top-_r_7_)" r="33.5"></circle><circle class="alma-lobe tc-auth-alma-lobe-3" cx="69" cy="74.5" fill="url(#alma-lobe-bottom-_r_7_)" r="37"></circle><circle class="alma-lobe tc-auth-alma-lobe-4" cx="34.5" cy="58" fill="url(#alma-lobe-left-_r_7_)" r="34"></circle></g><g class="alma-face"><rect class="alma-eye" data-eye="left" fill="url(#alma-eye-_r_7_)" height="20" rx="3.5" width="7" x="78.5" y="42"></rect><rect class="alma-eye" data-eye="right" fill="url(#alma-eye-_r_7_)" height="20" rx="3.5" width="7" x="89.5" y="42"></rect></g></g><g class="alma-thought"><circle cx="132" cy="3" fill="url(#alma-bubble-_r_7_)" r="15"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-0" cx="146" cy="3" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-1" cx="141.89949493661166" cy="12.899494936611664" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-2" cx="132" cy="17" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-3" cx="122.10050506338834" cy="12.899494936611665" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-4" cx="118" cy="3.0000000000000018" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-5" cx="122.10050506338834" cy="-6.899494936611664" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-6" cx="132" cy="-11" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle class="alma-bubble-bump tc-auth-alma-bump-7" cx="141.89949493661166" cy="-6.899494936611667" fill="url(#alma-bubble-_r_7_)" r="4"></circle><circle cx="110" cy="22" fill="url(#alma-bubble-_r_7_)" r="3"></circle></g></svg>`;
export const AUTH_ASSET_ORIGIN='https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
const texts={
 tr:{legal:'Yasal bağlantılar',terms:'Üyelik Sözleşmesi',privacy:'Gizlilik Politikası',kvkk:'KVKK Aydınlatma Metni',back:'Ana sayfa',lang:'Dil'},
 en:{legal:'Legal links',terms:'Membership Agreement',privacy:'Privacy Policy',kvkk:'Data Protection Notice',back:'Homepage',lang:'Language'}
};
export default function AuthShell({children,locale='tr',progress}:{children:ReactNode;locale?:'tr'|'en';progress?:number}){
 const t=texts[locale];
 const [langOpen,setLangOpen]=useState(false);
 return <main className="tc-next-auth tc-auth-shell-shell-viewport" lang={locale}>
  <div className="tc-auth-shell-shell-root">
   <div className="tc-auth-shell-shell-content-col">
    <header className="tc-auth-shell-progress-header">
     <a className="tc-auth-home-link" href="https://ticarti.com/" aria-label="Ticarti ana sayfa">
      <img className="tc-logo-original" src={AUTH_ASSET_ORIGIN+'/assets/images/ticarti-logo.svg'} alt="Ticarti"/>
     </a>
     <div className="tc-auth-shell-header-actions">
      {typeof progress==='number'?<div className="tc-auth-shell-progress-track" role="progressbar" aria-label="Kayıt ilerlemesi" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><div className="tc-auth-shell-progress-fill" style={{width:progress+'%'}}/></div>:null}
      <div className="tc-auth-language-wrap"><button className="tc-auth-language-label" type="button" aria-expanded={langOpen} aria-label="Change language" onClick={()=>setLangOpen(x=>!x)}>TR <span aria-hidden="true">⌄</span></button>{langOpen?<div className="tc-auth-language-options"><button type="button" onClick={()=>setLangOpen(false)}>Türkçe · TR</button><button type="button" onClick={()=>setLangOpen(false)}>English · EN</button></div>:null}</div>
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
   <aside className="tc-auth-shell-shell-alma-col" aria-label="TicAi kurulum rehberi">
    <div className="tc-auth-shell-alma-inner">
     <div className="tc-auth-alma-figure" aria-hidden="true" dangerouslySetInnerHTML={{__html:TICAI_ORIGINAL_SVG}}/>
     <div className="tc-auth-alma-message"><p className="tc-auth-alma-label">TicAi</p><p>Merhaba, ben TicAi. Ticarti deneyiminde sana yardımcı olacağım.</p></div>
    </div>
   </aside>
  </div>
 </main>;
}
