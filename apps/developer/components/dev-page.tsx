import type {ReactNode} from 'react';
import SiteShell from '@/components/site-shell';
export default function DevPage({title,description,children,aside}:{title:string;description:string;children:ReactNode;aside?:ReactNode}){
 return <SiteShell><main className="dev-doc"><div className="dev-doc__container">
  <nav className="dev-doc__breadcrumb" aria-label="İçerik yolu"><a href="/">Developer</a><span>/</span><span>{title}</span></nav>
  <header className="dev-doc__heading"><h1>{title}</h1><p>{description}</p></header>
  <div className="dev-doc__layout"><article className="dev-doc__article">{children}</article>
   <aside className="dev-doc__sidebar"><strong>Geliştirici merkezi</strong>
    <a href="/guide">Başlangıç</a><a href="/docs">Dokümantasyon</a>
    <a href="/docs/api">API referansı</a><a href="/docs/webhooks">Webhook’lar</a>
    <a href="/docs/security">Güvenlik</a><a href="/docs/themes">Tema geliştirme</a>
    <a href="/apps">Uygulamalarım</a><a href="/login">Giriş yap</a><a href="/register">Hesap oluştur</a>{aside}
   </aside>
  </div>
 </div></main></SiteShell>;
}
