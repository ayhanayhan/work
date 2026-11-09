import DevPage from '@/components/dev-page';
export const metadata={title:'Uygulamalarım | Ticarti Developer'};
export default function Page(){return <DevPage title="Uygulamalarım" description="Geliştirici uygulamalarınızı oluşturma ve yönetme alanı.">
 <h2>Geliştirici uygulamaları</h2><p>Önceki Developer portalında uygulama kaydı, uygulama detayları ve sürüm/izin yönetimi bulunuyordu. Bunlar mevcut yeniden oluşturulmuş Developer frontend'ine henüz aktarılmış değil.</p>
 <div className="dev-doc__notice"><p>Bu ekran şu anda gerçek uygulama kayıtlarını listelemiyor. Eski geliştirici kimlik doğrulaması ve uygulama API'si geri bağlanmadan örnek uygulamaları gerçekmiş gibi göstermiyoruz.</p></div>
 <h2>Uygulama yönetimi için gerekli bölümler</h2><div className="dev-doc__cards"><div className="dev-doc__card"><strong>Uygulama oluşturma</strong><span>Uygulama bilgileri, tür ve erişim kapsamları.</span><a href="/apps/new">Durumu görüntüle →</a></div><div className="dev-doc__card"><strong>Uygulama belgeleri</strong><span>API, webhook ve güvenlik kaynakları.</span><a href="/docs">Dokümantasyona git →</a></div></div>
 </DevPage>}