import DevPage from '@/components/dev-page';
export const metadata={title:'Tema geliştirme | Ticarti Developer'};
export default function Page(){return <DevPage title="Tema geliştirme" description="Ticarti mağaza temaları için paket hazırlığı, test ve dağıtım süreci.">
 <h2>Tema paketinin hazırlanması</h2><p>Tema ZIP'inizi sürüm, manifest, şablonlar ve statik varlıklarla birlikte düzenleyin. Dosya yollarını ve bağımlılıkları yayın öncesinde kontrol edin.</p>
 <h2>Güvenlik ve performans</h2><p>Harici script bağımlılıklarını ve büyük görsel yüklerini sınırlandırın. Başka mağazaların verilerine erişim sağlayan kodlar eklemeyin.</p>
 <h2>Tema yükleme politikası</h2><div className="dev-doc__notice"><p><strong>Önemli:</strong> Developer portalına tema ZIP yükleme veya tema inceleme başvurusu yapılmaz. Mağaza sahibi satın aldığı ya da geliştirdiği tema ZIP'ini kendi Admin → Temalar alanından yükler.</p></div>
 <h2>Test ve dağıtım</h2><ol><li>Tema paketini hazırlayın.</li><li>Mobil ve masaüstü görünümünü test edin.</li><li>Ürün, koleksiyon, sepet ve ödeme akışlarını kontrol edin.</li><li>Paketi mağaza sahibine ulaştırın; yükleme mağaza yönetiminden gerçekleştirilir.</li></ol>
 </DevPage>}