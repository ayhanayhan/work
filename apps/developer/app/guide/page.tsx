import DevPage from '@/components/dev-page';
export const metadata={title:'Başlangıç | Ticarti Developer'};
export default function Page(){return <DevPage title="Başlangıç rehberi" description="Ticarti API ve uygulama ekosistemine giriş. Önce bağlantıyı, ardından erişim gereksinimlerini kontrol edin.">
 <h2>1. API bağlantınızı doğrulayın</h2><p>Ticarti API, HTTPS ve JSON üzerinden iletişim kurar. İlk test için kimlik doğrulaması gerektirmeyen sağlık kontrolü kullanılabilir.</p>
 <pre><code>{'GET https://dev.ticarti.com/v1/health\nAccept: application/json'}</code></pre>
 <h2>2. Yetki modelini belirleyin</h2><p>Mağazaya ait veriler için yetkili mağaza oturumu ve ilgili izinler gerekir. Yönetim API'lerini herkese açık anahtarla çalıştırmayın.</p>
 <h2>3. Uygulamanızı planlayın</h2><p>Gerekli API uç noktalarını ve olay bildirimlerini belirleyin; hata yönetimini, tekrar denemeyi ve gizli verilerin sunucuda saklanmasını uygulayın.</p>
 <div className="dev-doc__cards"><div className="dev-doc__card"><strong>API referansı</strong><span>HTTP istekleri ve erişim koşulları.</span><a href="/docs/api">API'ye geç →</a></div><div className="dev-doc__card"><strong>Uygulamalarım</strong><span>Geliştirici hesabı ve uygulama yönetimi alanı.</span><a href="/apps">Uygulamalara git →</a></div></div>
 </DevPage>}