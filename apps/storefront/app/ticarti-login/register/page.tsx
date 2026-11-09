import type {Metadata} from 'next';
import QuickStoreForm from '../../ticarti-platform/QuickStoreForm';

export const metadata:Metadata={
  title:'Ücretsiz E-Ticaret Siteni Oluştur | Ticarti',
  description:'Ticarti hesabını oluştur, mağaza adresini seç ve e-ticaret siteni aç.',
  robots:{index:false,follow:false}
};

export default function RegisterPage(){
 return <main className="tc-auth-portal tc-auth-register">
  <section className="ticarti-login-brand">
   <a className="tc-auth-logo" href="https://ticarti.com/" aria-label="Ticarti ana sayfa">
    <img src="https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app/assets/images/ticarti-logo.svg" alt="Ticarti"/>
   </a>
   <div><h1>E-ticaret siteni oluştur.</h1><p>Ücretsiz hesabını aç, mağazana isim ver ve satışa başlamak için ilk adımı at.</p>
    <div className="tc-auth-benefits"><span>Mağazana özel adres</span><span>Tek panelden yönetim</span><span>Güvenli mağaza kurulumu</span></div>
   </div>
   <small>Ticarti · Ticaretin yeni hali</small>
  </section>
  <section className="tc-auth-register__panel">
   <div className="tc-auth-register__inner">
    <a className="tc-auth-return" href="/">Giriş yap</a>
    <QuickStoreForm/>
   </div>
  </section>
 </main>
}
