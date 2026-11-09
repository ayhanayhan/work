export type HelpTopic={id:string;title:string;summary:string;questions:{question:string;answer:string}[]};
export const HELP_TOPICS:HelpTopic[]=[
 {id:'baslangic',title:'Başlangıç ve Mağaza Kurulumu',summary:'Mağaza açma, kurulum adımları ve ilk yayın hazırlıkları.',questions:[
  {question:'Ticarti mağazamı nasıl açabilirim?',answer:'Ticarti üzerinden mağaza oluşturma adımlarını tamamlayın, paketinizi seçin ve mağaza yönetim paneline geçin. Mağaza bilgilerinizi, alan adınızı ve ödeme ayarlarınızı yayın öncesinde kontrol edin.'},
  {question:'Mağazamı yayınlamadan önce neleri kontrol etmeliyim?',answer:'Mağaza iletişim bilgileri, yasal sayfalar, ürünler, stoklar, vergi ayarları, ödeme yöntemleri ve kargo seçeneklerini kontrol edin. Gerçek sipariş almadan önce uçtan uca test yapın.'}]},
 {id:'urunler',title:'Ürünler ve Kategoriler',summary:'Ürün oluşturma, varyantlar, fiyatlar ve koleksiyonlar.',questions:[
  {question:'Bir ürüne farklı beden veya renk ekleyebilir miyim?',answer:'Varyantlı ürün kullanarak renk, beden ve diğer seçenekleri ayrı varyantlar halinde tanımlayabilirsiniz. Her varyantın stok, fiyat, SKU ve barkod bilgilerini kontrol edin.'},
  {question:'Ürünleri nasıl kategorilere ayırabilirim?',answer:'Ürünlerinizi kategoriler ve koleksiyonlar altında düzenleyebilirsiniz. Kategori ağacı ve ilişkili ürünler mağaza gezinmesini kolaylaştırır.'}]},
 {id:'siparisler',title:'Siparişler ve İadeler',summary:'Sipariş takibi, sipariş durumları, iptal ve iade süreçleri.',questions:[
  {question:'Yeni siparişleri nereden takip edebilirim?',answer:'Mağaza yönetim panelindeki sipariş alanından yeni siparişleri, ödeme ve gönderim durumlarını inceleyebilirsiniz.'},
  {question:'Bir iade talebi nasıl işlenir?',answer:'İlgili siparişin iade talebini inceleyin, iade nedenini ve ürün durumunu kontrol edin. İade ve stok hareketlerinin doğru işlendiğini doğrulayın.'}]},
 {id:'odemeler',title:'Ödemeler ve Vergiler',summary:'Ödeme sağlayıcıları, vergi ayarları ve ödeme sorunları.',questions:[
  {question:'Ödeme yöntemlerini nereden yapılandırabilirim?',answer:'Mağaza yönetim panelindeki ödeme ve entegrasyon ayarlarından kullanacağınız ödeme sağlayıcılarını yapılandırabilirsiniz. Sağlayıcınızın hesap ve doğrulama gerekliliklerini kontrol edin.'},
  {question:'KDV oranlarını nasıl yönetebilirim?',answer:'Mağaza vergi ayarlarını ürünlerinizin tabi olduğu vergi oranlarına göre düzenleyin. Tereddüt ettiğiniz vergi uygulamalarında mali müşavirinize danışın.'}]},
 {id:'kargo',title:'Kargo, Stok ve Depolar',summary:'Gönderiler, stok hareketleri ve depo operasyonları.',questions:[
  {question:'Birden fazla depoda stok takip edebilir miyim?',answer:'Depo ve stok yönetimi alanından ürünlerin depolara göre stoklarını takip edebilir, depo hareketlerini ve transfer taleplerini yönetebilirsiniz.'},
  {question:'Kargo hesaplamaları için ne kullanabilirim?',answer:'Gönderim ücretleri ve desi hesapları için kargo ayarlarınızı gözden geçirin. Ticarti hesaplama araçlarından desi hesaplayıcısını da kullanabilirsiniz.'}]},
 {id:'magaza-tasarimi',title:'Mağaza Tasarımı ve İçerik',summary:'Tema, menüler, sayfalar ve mağaza görünümü.',questions:[
  {question:'Mağaza menülerini nasıl düzenleyebilirim?',answer:'Mağaza yönetim panelinizden gezinme menülerini ve ilgili sayfaları düzenleyin. Değişikliklerden sonra masaüstü ve mobil görünümü kontrol edin.'},
  {question:'Mağazamın SEO bilgilerini nereden düzenlerim?',answer:'Ürün ve sayfa SEO alanlarında başlık, açıklama ve bağlantı bilgilerini düzenleyebilirsiniz. Sitenizdeki içeriğin ve dil sürümlerinin tutarlı olmasına dikkat edin.'}]},
 {id:'entegrasyonlar',title:'Entegrasyonlar ve Pazaryerleri',summary:'Pazaryeri bağlantıları ve harici hizmetler.',questions:[
  {question:'Pazaryeri entegrasyonu kurarken neler gerekli?',answer:'Bağlanacağınız pazaryerinin satıcı hesabı, API yetkileri ve mağaza eşleştirme bilgileri gerekebilir. Kullanılabilir entegrasyonları yönetim panelinizden kontrol edin.'},
  {question:'Siparişler neden eşitlenmiyor olabilir?',answer:'Bağlantının yetkilerini, seçili mağazayı ve entegrasyon durumunu kontrol edin. Sorun sürerse mağazanızdan destek talebi oluşturup etkilenen sipariş örneğini paylaşın.'}]},
 {id:'hesap',title:'Hesap, Güvenlik ve Faturalandırma',summary:'Giriş, mağaza erişimi, kullanıcı yetkileri ve paketler.',questions:[
  {question:'Mağaza hesabıma nasıl giriş yaparım?',answer:'Ticarti’nin mağaza giriş sayfasını kullanın. Birden fazla mağazanız varsa girişten sonra yönetmek istediğiniz mağazayı seçin.'},
  {question:'Destek talebini nasıl oluşturabilirim?',answer:'Mağaza hesabınızla oturum açın ve yönetim panelindeki Destek bölümüne gidin. Talebinizi doğru mağazada oluşturduğunuzu kontrol edin.'}]}
];
