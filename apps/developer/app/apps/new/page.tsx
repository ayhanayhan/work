import DevPage from '@/components/dev-page';
export const metadata={title:'Uygulama oluşturma | Ticarti Developer'};
export default function Page(){return <DevPage title="Uygulama oluştur" description="Önceki geliştirici uygulama kayıt akışının giriş noktası.">
 <div className="dev-doc__notice"><p>Güvenli uygulama kaydı için geliştirici hesabı ve uygulama oluşturma API'si gerekir. Mevcut backend'de bu akış doğrulanmadığı için işlevsiz bir kayıt formu sunulmuyor.</p></div>
 <h2>Geri bağlanacak alanlar</h2><ul><li>Uygulama adı, açıklaması ve türü</li><li>OAuth yönlendirme adresleri ve izin kapsamları</li><li>Uygulama sürümleri ve yayın durumu</li><li>Webhook adresleri ve olay abonelikleri</li></ul><a className="dev-doc__action" href="/apps">Uygulamalarım</a>
 </DevPage>}