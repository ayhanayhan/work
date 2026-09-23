'use client';
import Link from 'next/link';

function cleanHtml(v:any){return String(v||'').replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/javascript\s*:/gi,'')}
export default function Footer({boot}:{boot:any}){
  const f=boot?.design?.footer||{};const store=boot?.store||{};const contracts=boot?.contractPages||{};const menus=Array.isArray(boot?.menus)?boot.menus:[];
  const coreTheme=String(boot?.theme?.slug||'')==='nova-commerce';
  const footerMenus=menus.filter((m:any)=>['footer','footer-1','footer-2','information','support'].includes(String(m.handle||'').toLowerCase())).slice(0,3);
  const copyright=String(f.copyright||'© {{year}} {{store_name}}. Tüm hakları saklıdır.').replace(/\{\{year\}\}/g,String(new Date().getFullYear())).replace(/\{\{store_name\}\}/g,String(store.name||''));
  const legal=[['SHIPPING','Teslimat & Kargo'],['RETURNS','İade / Cayma'],['PRIVACY','Gizlilik'],['KVKK_NOTICE','KVKK'],['COOKIE_POLICY','Çerez Politikası']].filter(([type])=>contracts[type]);
  return <>{f.upperHtml&&<div className="footer-upper-html container" dangerouslySetInnerHTML={{__html:cleanHtml(f.upperHtml)}}/>}{coreTheme&&<><section className="core-service-strip"><div className="container"><div><span aria-hidden="true">◇</span><p><b>Hızlı ve güvenli teslimat</b><small>Siparişiniz özenle hazırlanır.</small></p></div><div><span aria-hidden="true">↺</span><p><b>Kolay iade</b><small>İade sürecinizi hesabınızdan yönetin.</small></p></div><div><span aria-hidden="true">▣</span><p><b>Güvenli ödeme</b><small>Ödeme bilgileriniz korunur.</small></p></div></div></section><section className="core-newsletter-band"><div className="container"><div><small>BÜLTENE KATILIN</small><h2>Yeni ürünleri ve fırsatları kaçırmayın.</h2></div><form onSubmit={e=>e.preventDefault()}><input type="email" aria-label="E-posta" placeholder="E-posta adresiniz"/><button>Kaydol</button></form></div></section></>}<footer data-design-target="footer" data-design-label="Footer" className={`footer footer-v${f.template||1}`}>
    <div className="container footer-main">
      <div className="footer-brand"><Link href="/" className="footer-logo">{store.logoUrl?<img src={store.logoUrl} alt={store.name||'Logo'}/>:<b>{store.name||'MAĞAZA'}</b>}</Link><p>{store.description||'Güvenli, hızlı ve modern alışveriş deneyimi.'}</p><div className="footer-social"><a href="#" aria-label="Instagram">ig</a><a href="#" aria-label="Facebook">f</a><a href="#" aria-label="X">x</a></div></div>
      {footerMenus.length?footerMenus.map((m:any,i:number)=><div className="footer-column" key={m.id||i}><b>{m.title||m.name||'Bağlantılar'}</b>{(m.items||[]).slice(0,7).map((x:any,j:number)=><Link key={j} href={x.href||x.url||x.path||'/'}>{x.label||x.title||x.name}</Link>)}</div>):<><div className="footer-column"><b>Mağaza</b><Link href="/products">Tüm Ürünler</Link><Link href="/blog">Blog</Link><Link href="/account">Hesabım</Link></div><div className="footer-column"><b>Yardım</b>{legal.slice(0,3).map(([type,label])=><Link key={type} href={contracts[type].href}>{contracts[type].title||label}</Link>)}</div></>}
      <div className="footer-newsletter"><b>Bizden haberdar olun</b><p>Kampanya ve yeni ürünleri e-posta ile alın.</p><form onSubmit={e=>e.preventDefault()}><input type="email" aria-label="E-posta" placeholder="E-posta adresiniz"/><button>→</button></form></div>
    </div>
    <div className="container footer-bottom"><span>{copyright}</span><div className="footer-legal">{legal.slice(-2).map(([type,label])=><Link key={type} href={contracts[type].href}>{contracts[type].title||label}</Link>)}</div><div className="footer-payment"><span>VISA</span><span>MC</span><span>AMEX</span></div></div>
  </footer></>;
}
