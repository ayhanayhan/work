import DevPage from '@/components/dev-page';
export const metadata={title:'Geliştirici girişi | Ticarti Developer'};
export default function Page(){return <DevPage title="Geliştirici girişi" description="Ticarti geliştirici hesabıyla uygulamalarınıza erişin.">
 <div className="dev-doc__notice"><p>Önceki geliştirici hesabı giriş servisi bu kaynak ağacında bulunmuyor. Mağaza hesabı girişiyle karıştırmamak için burada güvenli olmayan veya çalışmayan bir giriş formu oluşturmadık.</p></div>
 <p>Mevcut mağaza hesabınız için <a href="https://login.ticarti.com/">Ticarti mağaza girişini</a> kullanabilirsiniz. Geliştirici hesabı, eski kimlik doğrulama servisi geri alındıktan sonra bu adresten çalışacak.</p>
 <a href="/register" className="dev-doc__action">Geliştirici hesabı</a>
 </DevPage>}