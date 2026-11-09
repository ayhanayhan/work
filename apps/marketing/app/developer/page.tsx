import type {Metadata} from 'next';
import SiteShell from '@/components/site-shell';

export const metadata:Metadata={
 title:'Developer | Ticarti Geliştirici Merkezi',
 description:'Ticarti geliştirici rehberleri, API uç noktaları, mağaza uygulamaları ve webhook entegrasyonları.',
 alternates:{canonical:'https://dev.ticarti.com/'}
};
export const dynamic='force-dynamic';

const sections=[
 {id:'baslangic',no:'01',title:'Başlangıç',desc:'Ticarti platformunun geliştirici yapısını, API bağlantısını ve entegrasyon akışını tanıyın.',items:['API temel adresi','İstek ve yanıt yapısı','Hata durumları'],href:'#api'},
 {id:'kimlik',no:'02',title:'Kimlik doğrulama',desc:'Mağaza oturumları ve erişim izinlerinin nasıl korunduğunu öğrenin.',items:['Mağaza oturumu','Yetki kontrolü','Güvenli API erişimi'],href:'#guvenlik'},
 {id:'uygulamalar',no:'03',title:'Uygulamalar',desc:'Bir mağazaya ait yüklenmiş uygulamaları ve entegrasyon ayarlarını yönetin.',items:['Yüklü uygulamalar','Uygulama ayarları','Mağaza yetkileri'],href:'#endpoints'},
 {id:'webhook',no:'04',title:'Webhook’lar',desc:'Mağaza olayları için webhook aboneliklerini yapılandırın.',items:['Webhook kaydı','Olay abonelikleri','Güvenli teslimat'],href:'#endpoints'}
];
const endpoints=[
 {method:'GET',route:'/v1/health',detail:'API sağlık kontrolü',access:'Genel erişim'},
 {method:'GET',route:'/v1/admin/apps/installed',detail:'Mağazanın yüklü uygulamaları',access:'Mağaza oturumu ve yetki gerekir'},
 {method:'GET',route:'/v1/admin/webhooks',detail:'Mağazanın webhook kayıtları',access:'Mağaza oturumu ve yetki gerekir'},
 {method:'POST',route:'/v1/admin/webhooks',detail:'Webhook aboneliği oluşturma',access:'Mağaza oturumu ve yetki gerekir'}
];
export default function DeveloperHomePage(){
 return <SiteShell><main className="tc-dev" id="icerik">
  <div className="tc-dev__container">
   <section className="tc-dev__hero" aria-labelledby="dev-title">
    <p className="tc-dev__eyebrow">TİCARTİ DEVELOPER</p>
    <h1 id="dev-title">Ticarti ile geliştirmeye başlayın.</h1>
    <p className="tc-dev__lead">API bağlantılarını, uygulama entegrasyonlarını ve webhook akışlarını tek yerden keşfedin. İhtiyacınız olan teknik bilgilere kolayca ulaşın.</p>
    <div className="tc-dev__hero-actions">
     <a className="tc-dev__primary" href="#rehberler">Geliştirici rehberleri <span aria-hidden="true">↗</span></a>
     <a className="tc-dev__secondary" href="#api">API bilgileri <span aria-hidden="true">↗</span></a>
    </div>
    <nav className="tc-dev__quick-nav" aria-label="Geliştirici kısayolları">
     <a href="#rehberler">Rehberler</a><a href="#api">API</a><a href="#endpoints">Uç noktalar</a><a href="#guvenlik">Güvenlik</a><a href="https://help.ticarti.com/">Yardım Merkezi <span aria-hidden="true">↗</span></a>
    </nav>
   </section>
   <section className="tc-dev__section" id="rehberler" aria-labelledby="dev-guides">
    <div className="tc-dev__section-head"><div><p className="tc-dev__eyebrow">DOKÜMANTASYON</p><h2 id="dev-guides">Geliştirici rehberleri</h2></div><p>Entegrasyon geliştirirken ihtiyaç duyacağınız temel konular.</p></div>
    <div className="tc-dev__grid">{sections.map(s=><article className="tc-dev__card" key={s.id}>
     <span className="tc-dev__number">{s.no}</span><h3>{s.title}</h3><p>{s.desc}</p>
     <ul>{s.items.map(x=><li key={x}>{x}</li>)}</ul><a href={s.href}>İncele <span aria-hidden="true">↗</span></a>
    </article>)}</div>
   </section>
   <section className="tc-dev__section tc-dev__api" id="api" aria-labelledby="dev-api">
    <div><p className="tc-dev__eyebrow">API</p><h2 id="dev-api">Tek bir API, birçok entegrasyon.</h2>
     <p>Ticarti API'si HTTPS üzerinden JSON yanıtları sunar. Genel uç noktalar ile mağaza oturumu ve yetki gerektiren uç noktalar birbirinden ayrıdır.</p>
     <a className="tc-dev__inline-link" href="#endpoints">Uç noktaları görüntüle <span aria-hidden="true">↗</span></a>
    </div>
    <div className="tc-dev__code"><div className="tc-dev__code-head"><span>Bağlantı örneği</span><span>HTTP</span></div>
     <pre><code>{'GET https://dev.ticarti.com/v1/health\nAccept: application/json'}</code></pre>
     <div className="tc-dev__code-note">Sağlık kontrolü, kimlik doğrulaması gerektirmeyen örnek bir istektir.</div>
    </div>
   </section>
   <section className="tc-dev__section" id="endpoints" aria-labelledby="dev-endpoints">
    <div className="tc-dev__section-head"><div><p className="tc-dev__eyebrow">API REFERANSI</p><h2 id="dev-endpoints">Temel uç noktalar</h2></div><p>Mevcut Ticarti API kodunda tanımlı örnek yollar.</p></div>
    <div className="tc-dev__endpoint-list">{endpoints.map(e=><div className="tc-dev__endpoint" key={e.route+e.method}>
     <span className={'tc-dev__method '+(e.method==='POST'?'tc-dev__method--post':'')}>{e.method}</span>
     <div><code>{e.route}</code><p>{e.detail}</p></div>
     <span className="tc-dev__access">{e.access}</span>
    </div>)}</div>
    <p className="tc-dev__fineprint">Bu liste bir API anahtarı veya herkese açık yönetim erişimi sağlamaz. Yönetim uç noktaları yetkili mağaza oturumu gerektirir.</p>
   </section>
   <section className="tc-dev__section tc-dev__security" id="guvenlik" aria-labelledby="dev-security">
    <div><p className="tc-dev__eyebrow">GÜVENLİK</p><h2 id="dev-security">Entegrasyonlarda güvenlik</h2>
     <p>Mağaza verileri tenant sınırları ve izin kontrolleriyle korunur. İstekleri uygun kimlik doğrulama yöntemiyle, yalnızca yetkili mağaza bağlamında gerçekleştirin.</p></div>
    <div className="tc-dev__security-points"><div><strong>Yetkilendirme</strong><span>Mağazaya özel erişim izinlerini kullanın.</span></div>
     <div><strong>Veri ayrımı</strong><span>Mağaza verilerini birbirinden bağımsız tutun.</span></div>
     <div><strong>Gizlilik</strong><span>Kimlik bilgilerini istemci kodunda yayınlamayın.</span></div></div>
   </section>
   <section className="tc-dev__closing"><div><h2>Yardıma mı ihtiyacınız var?</h2><p>Entegrasyon veya uygulama geliştirmeyle ilgili bir sorunuz varsa mevcut Ticarti destek kanallarından bize ulaşın.</p></div>
    <div className="tc-dev__closing-actions"><a className="tc-dev__primary" href="https://help.ticarti.com/">Yardım Merkezi <span aria-hidden="true">↗</span></a><a href="https://login.ticarti.com/?intent=support">Destek talebi oluştur</a></div>
   </section>
  </div>
 </main></SiteShell>;
}
