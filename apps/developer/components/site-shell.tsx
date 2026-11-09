import type {ReactNode} from 'react';
const navigation=[{label:'Dokümantasyon',href:'/#rehberler'},{label:'API',href:'/#api'},{label:'Uç noktalar',href:'/#endpoints'},{label:'Güvenlik',href:'/#guvenlik'}];
export default function SiteShell({children}:{children:ReactNode}){
 return <>
  <header className="tc-portal-header"><div className="tc-portal-header__inner">
   <a href="/" className="tc-portal-logo" aria-label="Ticarti Developer ana sayfa"><span className="tc-portal-logo__symbol">t</span><span>ticarti<span className="tc-portal-logo__suffix"> / Developer</span></span></a>
   <nav aria-label="Geliştirici menüsü">{navigation.map(item=><a key={item.href} href={item.href}>{item.label}</a>)}</nav>
   <a className="tc-portal-header__help" href="https://help.ticarti.com/">Yardım Merkezi ↗</a>
  </div></header>
  {children}
  <footer className="tc-portal-footer"><div className="tc-portal-footer__inner">
   <div><a className="tc-portal-footer__brand" href="https://ticarti.com/">ticarti</a><p>Ticaretin yeni hali.</p></div>
   <nav aria-label="Alt menü"><a href="/">Developer</a><a href="https://help.ticarti.com/">Yardım Merkezi</a><a href="https://ticarti.com/">Ticarti.com</a><a href="https://ticarti.com/iletisim">İletişim</a></nav>
  </div><div className="tc-portal-footer__bottom">© {new Date().getFullYear()} Ticarti. Tüm hakları saklıdır.</div></footer>
  <link rel="stylesheet" href="/assets/css/marketing-developer.css"/>
 </>;
}
