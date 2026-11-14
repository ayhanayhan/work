import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import './marketplace.css';

export const metadata: Metadata = {
  title: {
    default: 'Ticarti Uygulama Mağazası',
    template: '%s | Ticarti Uygulama Mağazası',
  },
  description: 'Ticarti uygulamalarını keşfedin. Kargo, muhasebe, pazarlama ve ödeme entegrasyonları.',
  alternates: { canonical: 'https://apps.ticarti.com/' },
};

function SiteHeader(){
  return <header className="tc-native-header">
    <div className="tc-native-header-inner">
      <a className="tc-native-brand" href="https://ticarti.com" aria-label="Ticarti ana sayfa">ticarti<span>.</span></a>
      <form className="tc-native-search" action="/" method="get" role="search">
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
        <input type="search" name="q" placeholder="Uygulama, kategori veya geliştirici ara..." aria-label="Uygulama ara"/>
        <button type="submit" aria-label="Uygulamaları ara"><svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg></button>
      </form>
      <a className="tc-native-login" href="https://login.ticarti.com/">Giriş Yap</a>
    </div>
    <nav className="tc-native-category-nav" aria-label="Uygulama mağazası menüsü">
      <div className="tc-native-category-inner">
        <a href="/">Tüm uygulamalar</a>
        <a href="/kategoriler">Kategoriler</a>
        <a href="/kategoriler?sort=popular">Popüler uygulamalar</a>
        <a href="/kategoriler?sort=newest">Yeni uygulamalar</a>
        <span className="tc-native-nav-spacer"/>
        <a href="https://ticarti.com">Ticarti</a>
        <a href="https://help.ticarti.com">Yardım Merkezi</a>
      </div>
    </nav>
  </header>;
}

function SiteFooter(){
  return <footer className="tc-native-footer">
    <div className="tc-native-footer-inner">
      <div><a className="tc-native-brand" href="https://ticarti.com">ticarti<span>.</span></a><p>Ticaretin yeni hali.</p></div>
      <nav aria-label="Alt menü"><a href="https://ticarti.com">Ticarti</a><a href="https://dev.ticarti.com">Geliştirici</a><a href="https://help.ticarti.com">Yardım</a></nav>
      <small>© {new Date().getFullYear()} Ticarti</small>
    </div>
  </footer>;
}

export default function RootLayout({children}:{children:ReactNode}){
  return <html lang="tr"><body><div className="tc-app-surface tc-native-marketplace"><SiteHeader/>{children}<SiteFooter/></div></body></html>;
}
