import DevPage from '@/components/dev-page';
export const metadata={title:'Geliştirici hesabı | Ticarti Developer'};
export default function Page(){return <DevPage title="Geliştirici hesabı oluştur" description="Uygulamalar geliştirmek ve yönetmek için geliştirici hesabı açma alanı.">
 <div className="dev-doc__notice"><p>Eski Developer portalındaki geliştirici kayıt servisi bu kaynakta eksik. Hesap oluşturmayı doğrulayan backend bulunmadan kullanıcı bilgisi toplayan sahte bir form eklemedik.</p></div>
 <h2>Geliştirici hesabıyla yönetilecek işlemler</h2><ul><li>Uygulama ve entegrasyon oluşturma</li><li>Uygulama sürümleri ve yayın akışı</li><li>Güvenli OAuth istemci ayarları</li><li>Webhook ve yetki tanımları</li></ul><a className="dev-doc__action" href="/guide">Başlangıç rehberi</a>
 </DevPage>}
