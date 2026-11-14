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
      <nav aria-label="Ana menü">
        <a href="https://ticarti.com">Ana Sayfa</a>
        <a href="https://ticarti.com/paketler">Paketler</a>
        <a href="/" aria-current="page">Uygulamalar</a>
        <a href="https://help.ticarti.com">Yardım</a>
      </nav>
      <a className="tc-native-login" href="https://login.ticarti.com/">Giriş Yap</a>
    </div>
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
