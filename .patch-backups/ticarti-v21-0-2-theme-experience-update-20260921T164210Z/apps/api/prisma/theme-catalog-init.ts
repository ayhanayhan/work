import {PrismaClient} from '@prisma/client';
const prisma=new PrismaClient();

const modules=[
['accordion','Akordeon'],['announcement','Duyuru Çubuğu'],['app_area','Uygulama Alanı'],['back_to_top','Yukarı Dön'],['hero','Hero'],['video_hero','Video Hero'],['banner_collage','Banner Kolaj'],['banner_text_outside','Dış Metinli Banner'],['banner','Banner'],['blog_posts','Blog Yazıları'],['header_blurb','Header Bilgi Alanı'],['brands_grid','Marka Grid'],['brands_list','Marka Listesi'],['cart_drawer','Sepet Çekmecesi'],['free_shipping_bar','Ücretsiz Kargo Çubuğu'],['collage','Kolaj'],['collection_spotlight','Kategori Spotlight'],['collection_text','Metinli Kategori'],['collection_image_text','Görselli Kategori'],['collection_list','Kategori Listesi'],['category_slider','Kategori Slider'],['contact_form','İletişim Formu'],['counter','Sayaç'],['discount_banner','İndirim Bannerı'],['featured_collection_row','Öne Çıkan Koleksiyon Satırı'],['featured_collection_tabs','Koleksiyon Sekmeleri'],['featured_collection','Öne Çıkan Koleksiyon'],['featured_product','Öne Çıkan Ürün'],['footer_logo','Footer Logo'],['footer_mobile_nav','Mobil Alt Menü'],['gallery','Galeri'],['masonry_gallery','Masonry Galeri'],['product_grid','Ürün Grid'],['image_comparison','Görsel Karşılaştırma'],['product_list','Ürün Listesi'],['hover_image_list','Hover Görselli Liste'],['lookbook','Lookbook'],['shop_the_look','Görünümü Satın Al'],['map','Harita'],['media_collage','Medya Kolaj'],['media_text_vertical','Dikey Medya + Metin'],['media_text','Medya + Metin'],['mega_menu_module','Mega Menü Modülü'],['newsletter','Bülten'],['icon_features','İkonlu Özellikler'],['popular_categories','Popüler Kategoriler'],['product_vertical_tabs','Dikey Ürün Sekmeleri'],['product_banner_list','Bannerlı Ürün Listesi'],['recently_viewed','Son Görüntülenenler'],['recommendations','Ürün Önerileri'],['promotion_popup','Promosyon Popup'],['shoppable_feed','Alışveriş Akışı'],['slider','Slider'],['tags','Etiketler'],['icon_columns','İkonlu Kolonlar'],['trust_badges','Güven Rozetleri'],['promo_cards','Promosyon Kartları'],['rich_text','Zengin Metin'],['ticker_collection','Kategori Ticker'],['ticker_text','Metin Ticker'],['testimonials','Müşteri Yorumları'],['testimonials_large','Büyük Müşteri Yorumları'],['instagram','Instagram Akışı'],['twitter','Sosyal Akış'],['video','Video'],['countdown','Geri Sayım'],['spacer','Boşluk'],['divider','Ayraç'],['custom_html','Özel HTML']
].map(([type,label])=>({type,label,enabled:true}));

type SectionPreset={sectionType:string;settings:any;enabled?:boolean};
const s=(sectionType:string,settings:any={}):SectionPreset=>({sectionType,enabled:true,settings:{colDesktop:12,colTablet:12,colMobile:12,textAlign:'left',...settings}});

// Brand-neutral storefront presets backed by Ticarti data and runtime components.
const editorialHome:SectionPreset[]=[
  s('banner',{variant:'double',title:'Koleksiyonları keşfedin',subtitle:'Yeni sezon',content:'Mağazanızdaki kategorileri güçlü görsellerle öne çıkarın.',items:[{title:'Yeni Gelenler',buttonText:'Keşfet'},{title:'Seçkiler',buttonText:'İncele'}]}),
  s('slider',{variant:'fullscreen',heightDesktop:600,heightMobile:700,autoplay:true,autoplaySeconds:5,transition:'flip',items:[{title:'Yeni sezon şimdi vitrinde',content:'Gerçek ürün ve kategorilerinizle otomatik çalışır.',buttonText:'Alışverişe Başla'},{title:'Markanızı öne çıkarın',content:'Güçlü tipografi ve geniş görsel alanları.',buttonText:'Koleksiyonu Gör'},{title:'Hızlı ve mobil odaklı',content:'Responsive medya ve modern vitrin deneyimi.',buttonText:'Keşfet'}]}),
  s('banner_collage',{variant:'mosaic-6',title:'Koleksiyonlar',items:[{title:'Yeni Gelenler'},{title:'Çok Satanlar'},{title:'Kadın'},{title:'Erkek'},{title:'Aksesuar'},{title:'Fırsatlar'}]}),
  s('featured_collection',{variant:'grid',subtitle:'Çok Satanlar',title:'En Sevilen Ürünler',content:'Mağazanızın öne çıkan ürünleri.',count:12,columnsDesktop:6,columnsTablet:3,columnsMobile:2,showVendor:true,showRating:true,showWishlist:true,showCompare:true,showQuickView:true}),
  s('banner',{variant:'split',title:'Sezon seçkisi',subtitle:'Editoryal vitrin',content:'Kampanya, kategori veya marka hikayenizi anlatın.',buttonText:'İncele'}),
  s('featured_collection',{variant:'grid',subtitle:'Yeni',title:'Yeni Gelenler',count:12,columnsDesktop:6,columnsTablet:3,columnsMobile:2}),
  s('ticker_text',{variant:'marquee',items:[{text:'Ücretsiz kargo'},{text:'Kolay iade'},{text:'Güvenli ödeme'},{text:'Hızlı teslimat'}]}),
  s('featured_product',{variant:'media-left',title:'Öne çıkan ürün'}),
  s('ticker_text',{variant:'marquee-outline',items:[{text:'Yeni sezon'},{text:'Özel fırsatlar'},{text:'Sınırlı stok'}]}),
  s('brands_grid',{variant:'logos',title:'Markalar',count:8}),
  s('shoppable_feed',{variant:'grid-8',title:'Stilini Keşfet',subtitle:'İlham',count:8}),
  s('blog_posts',{variant:'cards',subtitle:'Blog',title:'Yeni İçerikler',content:'Markanızdan haberler, ilham ve rehberler.',count:6,columnsDesktop:4}),
  s('testimonials',{variant:'cards',subtitle:'Yorumlar',title:'Müşteriler Ne Diyor?',count:6}),
  s('gallery',{variant:'grid-8',subtitle:'Sosyal',title:'Görsel Akış',count:8,imageRatio:'1/1'})
];

const marketHome:SectionPreset[]=[
  s('announcement',{title:'Hızlı teslimat · Güvenli ödeme · Kolay iade'}),
  s('slider',{variant:'wide',heightDesktop:520,autoplay:true,items:[{title:'Günün fırsatları',buttonText:'Fırsatları Gör'},{title:'Yeni ürünler',buttonText:'İncele'}]}),
  s('popular_categories',{variant:'tiles',title:'Popüler Kategoriler',count:10}),
  s('featured_collection_tabs',{variant:'tabs',title:'Öne Çıkanlar',count:12,columnsDesktop:5}),
  s('discount_banner',{variant:'wide',title:'Haftanın fırsatı',content:'Seçili ürünlerde avantajlı fiyatlar.',buttonText:'İncele'}),
  s('product_banner_list',{variant:'banner-left',title:'Sizin İçin Seçtik',count:8}),
  s('brands_grid',{title:'Popüler Markalar',count:10}),
  s('recently_viewed',{title:'Son Görüntülenenler',count:8}),
  s('icon_columns',{variant:'service-3',items:[{title:'Hızlı Teslimat',text:'Siparişleriniz güvenle hazırlanır.'},{title:'Kolay İade',text:'İade süreçlerini kolayca yönetin.'},{title:'Güvenli Ödeme',text:'Güvenli ödeme altyapısı.'}]}),
  s('newsletter',{variant:'dark',title:'Fırsatları kaçırmayın',content:'Kampanya ve yeniliklerden haberdar olun.'})
];

const minimalHome:SectionPreset[]=[
  s('slider',{variant:'minimal',heightDesktop:640,autoplay:false,items:[{title:'Sade. Güçlü. Zamansız.',content:'Ürünlerinizi öne çıkaran ferah vitrin.',buttonText:'Koleksiyonu Gör'}]}),
  s('collection_spotlight',{variant:'editorial',title:'Seçili Koleksiyonlar',count:4}),
  s('featured_collection',{variant:'minimal',title:'Yeni Gelenler',count:8,columnsDesktop:4}),
  s('media_text',{variant:'large-media',title:'Marka Hikayesi',content:'Markanızın hikayesini geniş görsel alanı ve güçlü tipografiyle anlatın.',buttonText:'Hikayemiz'}),
  s('featured_product',{variant:'minimal',title:'Editörün Seçimi'}),
  s('blog_posts',{variant:'editorial',title:'Journal',count:3}),
  s('newsletter',{variant:'minimal',title:'Bültene Katıl'})
];

const lifestyleHome:SectionPreset[]=[
  s('slider',{variant:'soft',heightDesktop:620,autoplay:true,items:[{title:'Yaşam alanınıza yeni bir dokunuş',buttonText:'Keşfet'},{title:'Sezonun favorileri',buttonText:'İncele'}]}),
  s('banner_collage',{variant:'mosaic-4',title:'Yaşam Alanları',items:[{title:'Salon'},{title:'Mutfak'},{title:'Dekorasyon'},{title:'Aydınlatma'}]}),
  s('featured_collection',{variant:'soft',title:'Öne Çıkan Ürünler',count:8,columnsDesktop:4}),
  s('media_collage',{variant:'story',title:'Doğal ve zamansız',content:'Koleksiyonunuzu hikaye odaklı bir sunumla öne çıkarın.'}),
  s('collection_list',{variant:'circles',title:'Kategoriler',count:8}),
  s('testimonials_large',{variant:'large',title:'Müşterilerimizin Favorileri',count:4}),
  s('gallery',{variant:'masonry',title:'İlham Galerisi',count:8}),
  s('newsletter',{variant:'soft',title:'İlhamı kaçırmayın'})
];

const performanceHome:SectionPreset[]=[
  s('slider',{variant:'sport',heightDesktop:560,autoplay:true,items:[{title:'Harekete geç',content:'Performans ürünlerini güçlü bir vitrinle sunun.',buttonText:'Alışverişe Başla'}]}),
  s('ticker_text',{variant:'bold',items:[{text:'PERFORMANS'},{text:'DAYANIKLILIK'},{text:'HIZ'},{text:'ENERJİ'}]}),
  s('popular_categories',{variant:'cards',title:'Kategoriler',count:6}),
  s('featured_collection_tabs',{variant:'tabs-bold',title:'En Çok Tercih Edilenler',count:10}),
  s('banner_collage',{variant:'mosaic-3',items:[{title:'Outdoor'},{title:'Training'},{title:'Running'}]}),
  s('featured_product',{variant:'sport',title:'Haftanın Ürünü'}),
  s('blog_posts',{variant:'cards',title:'Rehber & İlham',count:3}),
  s('newsletter',{variant:'bold',title:'Topluluğa Katıl'})
];

const novaHome:SectionPreset[]=[
  s('slider',{variant:'source-fullwidth',heightDesktop:680,heightMobile:600,autoplay:true,autoplaySeconds:5,transition:'slide',items:[{subtitle:'YENİ KOLEKSİYON',title:'Yeni sezonu keşfedin',content:'Yeni ürünler, zamansız parçalar ve mağazanıza özel seçkiler.',buttonText:'Alışverişe Başla',linkUrl:'/products?sort=newest'},{subtitle:'ÇOK SEVİLENLER',title:'Favoriler yeniden vitrinde',content:'Müşterilerinizin en çok tercih ettiği ürünleri keşfedin.',buttonText:'Çok Satanları Gör',linkUrl:'/products?sort=popular'}]}),
  s('banner_collage',{variant:'source-collage',title:'Koleksiyonlar',items:[{title:'Yeni Gelenler',buttonText:'Keşfet',linkUrl:'/products?sort=newest'},{title:'Çok Satanlar',buttonText:'İncele',linkUrl:'/products?sort=popular'},{title:'Günün Seçkisi',buttonText:'Alışverişe Başla',linkUrl:'/products'}]}),
  s('featured_collection',{variant:'source-grid',subtitle:'ÖNE ÇIKANLAR',title:'Çok Sevilen Ürünler',count:12,columnsDesktop:4,columnsTablet:3,columnsMobile:2,showVendor:true,showRating:true,showWishlist:true,showCompare:true,showQuickView:true}),
  s('ticker_text',{variant:'source-marquee',items:[{text:'YENİ ÜRÜNLER'},{text:'GÜVENLİ ÖDEME'},{text:'KOLAY İADE'},{text:'HIZLI TESLİMAT'}]}),
  s('collection_spotlight',{variant:'source-collections',subtitle:'KOLEKSİYONLAR',title:'Tarzınıza Göre Keşfedin',count:6}),
  s('product_banner_list',{variant:'banner-left source-products',title:'Sizin İçin Seçtik',subtitle:'HAFTANIN SEÇKİSİ',count:6}),
  s('featured_collection_tabs',{variant:'source-tabs',subtitle:'VİTRİN',title:'Yeni Gelenler',count:12,columnsDesktop:4,tabCount:5}),
  s('featured_product',{variant:'source-featured',title:'Öne Çıkan Ürün'}),
  s('banner_text_outside',{variant:'source-story',subtitle:'HİKÂYEMİZ',title:'Detaylarıyla fark yaratan ürünler',content:'Markanızın hikâyesini güçlü görseller ve sade bir anlatımla paylaşın.',buttonText:'Hikâyemizi Keşfet',linkUrl:'/pages/hakkimizda'}),
  s('lookbook',{variant:'source-hotspots',title:'Görünümü Tamamla',count:4}),
  s('brands_grid',{variant:'source-logos',title:'Markalar',count:10}),
  s('shoppable_feed',{variant:'source-feed',title:'Stil İlhamı',subtitle:'KEŞFET',count:8}),
  s('testimonials',{variant:'source-reviews',subtitle:'YORUMLAR',title:'Müşteriler Ne Diyor?',count:6}),
  s('blog_posts',{variant:'source-blog',subtitle:'BLOG',title:'Yeni İçerikler',count:3,columnsDesktop:3}),
  s('accordion',{title:'Alışveriş Rehberi',items:[{title:'Teslimat seçenekleri',text:'Uygun teslimat seçenekleri ödeme adımında gösterilir.'},{title:'Kolay iade',text:'İade koşullarını mağaza sayfasından inceleyebilirsiniz.'},{title:'Güvenli ödeme',text:'Ödemeler güvenli altyapı üzerinden işlenir.'}]})
];

const atelierHome:SectionPreset[]=[
  s('slider',{variant:'fullscreen editorial',heightDesktop:720,autoplay:true,autoplaySeconds:6,items:[{subtitle:'YENİ KOLEKSİYON',title:'Zamansız parçalar',content:'Sade çizgiler, güçlü bir duruş.',buttonText:'Koleksiyonu keşfet'},{subtitle:'ATÖLYEDEN',title:'Detaylarda saklı',content:'Özenle seçilmiş ürünlerle editoryal vitrin.',buttonText:'Şimdi incele'}]}),
  s('collection_spotlight',{variant:'editorial',title:'Koleksiyonlar',count:4}),
  s('featured_collection',{variant:'editorial',subtitle:'Yeni',title:'Yeni Gelenler',count:8,columnsDesktop:4}),
  s('banner_text_outside',{variant:'media-right',subtitle:'Hikâyemiz',title:'Malzeme ve form',content:'Marka dünyanızı geniş görsel ve güçlü tipografiyle anlatın.',buttonText:'Devamını oku'}),
  s('hover_image_list',{title:'Seçkiler',count:5}),
  s('featured_collection_row',{variant:'editorial',title:'Editörün Seçimi',count:8}),
  s('lookbook',{variant:'hotspots',title:'Görünümü Keşfet',count:4}),
  s('blog_posts',{variant:'editorial',subtitle:'Journal',title:'Notlar',count:3}),
  s('newsletter',{variant:'minimal',title:'Yeni hikâyelerden haberdar olun'})
];

const noyaHome:SectionPreset[]=[
  s('slider',{variant:'minimal',heightDesktop:680,autoplay:false,items:[{subtitle:'NOYA EDIT',title:'Az, öz ve iyi.',content:'Ürünü merkeze alan sessiz bir vitrin.',buttonText:'Seçkiyi gör'}]}),
  s('collection_text',{variant:'numbered',title:'Kategoriler',count:6}),
  s('featured_collection',{variant:'minimal',title:'Yeni Nesneler',count:8,columnsDesktop:4}),
  s('media_text',{variant:'large-media',subtitle:'Stüdyo',title:'İşlev ve denge',content:'Sade ürün hikâyeleri için ferah bir anlatım alanı.',buttonText:'Hakkımızda'}),
  s('image_comparison',{title:'Malzemeyi Yakından Görün'}),
  s('icon_columns',{variant:'line',items:[{title:'Düşünülmüş Tasarım',text:'Sade ve işlevsel ürünler.'},{title:'Güvenli Teslimat',text:'Özenle paketlenen siparişler.'},{title:'Kolay İade',text:'Açık ve anlaşılır süreç.'}]}),
  s('blog_posts',{variant:'minimal',title:'Okuma Listesi',count:3}),
  s('newsletter',{variant:'minimal',title:'Bültene katıl'})
];

const orbitHome:SectionPreset[]=[
  s('announcement',{title:'Aynı gün kargo · Yetkili ürünler · Güvenli ödeme'}),
  s('slider',{variant:'wide market',heightDesktop:500,autoplay:true,items:[{subtitle:'GÜNÜN FIRSATI',title:'Teknolojide yeni dönem',buttonText:'Fırsatları gör'},{subtitle:'YENİ',title:'Akıllı yaşam ürünleri',buttonText:'Keşfet'}]}),
  s('popular_categories',{variant:'tiles',title:'Kategoriler',count:10}),
  s('featured_collection_tabs',{variant:'tabs',title:'Çok Satan Teknoloji',count:10,tabCount:5}),
  s('discount_banner',{variant:'compact',title:'Haftanın Teknoloji Fırsatı',content:'Seçili ürünlerde sınırlı süreli fiyatlar.',buttonText:'Fırsatı yakala'}),
  s('product_banner_list',{variant:'banner-left',title:'Oyun & Eğlence',count:6}),
  s('tags',{title:'Popüler Aramalar'}),
  s('brands_grid',{title:'Öne Çıkan Markalar',count:10}),
  s('recently_viewed',{title:'Son Baktıklarınız',count:8}),
  s('newsletter',{variant:'dark',title:'Teknoloji fırsatlarını kaçırmayın'})
];

const casaHome:SectionPreset[]=[
  s('slider',{variant:'soft',heightDesktop:640,autoplay:true,items:[{subtitle:'EV & YAŞAM',title:'Evinize iyi gelen detaylar',buttonText:'Koleksiyonu keşfet'},{subtitle:'YENİ SEZON',title:'Doğal dokular',buttonText:'İncele'}]}),
  s('banner_collage',{variant:'mosaic-4',title:'Yaşam Alanları',items:[{title:'Salon'},{title:'Mutfak'},{title:'Yatak Odası'},{title:'Aydınlatma'}]}),
  s('featured_collection',{variant:'soft',title:'Evinizin Favorileri',count:8,columnsDesktop:4}),
  s('media_collage',{variant:'story',subtitle:'EVDE HİKÂYE',title:'Doğal ve zamansız',content:'Sıcak tonlar ve yaşayan malzemeler.'}),
  s('collection_list',{variant:'circles',title:'Odana Göre Seç',count:8}),
  s('lookbook',{variant:'room',title:'Odayı Tamamla',count:4}),
  s('testimonials_large',{variant:'large',title:'Evlerden İlham',count:4}),
  s('gallery',{variant:'masonry',title:'İlham Galerisi',count:8}),
  s('newsletter',{variant:'soft',title:'İlhamı kaçırmayın'})
];

const aureliaHome:SectionPreset[]=[
  s('slider',{variant:'beauty',heightDesktop:660,autoplay:true,items:[{subtitle:'RİTÜELİNİ KEŞFET',title:'Işığını ortaya çıkar',buttonText:'Şimdi keşfet'},{subtitle:'YENİ FORMÜL',title:'Nazik ve etkili bakım',buttonText:'İncele'}]}),
  s('collection_image_text',{variant:'beauty',title:'Bakım Rutinleri',count:4}),
  s('featured_collection_tabs',{variant:'beauty-tabs',title:'En Sevilenler',count:8}),
  s('featured_product',{variant:'beauty',title:'Günün Ritüeli'}),
  s('image_comparison',{title:'Bakım Sonuçlarını Keşfedin'}),
  s('icon_columns',{variant:'beauty',items:[{title:'Temiz İçerik',text:'Özenle seçilen bileşenler.'},{title:'Hayvan Dostu',text:'Duyarlı üretim yaklaşımı.'},{title:'Uzman Seçimi',text:'Rutininize uygun öneriler.'}]}),
  s('testimonials',{variant:'beauty',title:'Gerçek Deneyimler',count:4}),
  s('shoppable_feed',{variant:'beauty',title:'Aurelia Günlükleri',count:8}),
  s('newsletter',{variant:'beauty',title:'Güzellik notları e-postanıza gelsin'})
];

const veloHome:SectionPreset[]=[
  ...performanceHome.slice(0,2),
  s('category_slider',{variant:'sport',title:'Disiplinini Seç',count:6}),
  s('featured_collection_tabs',{variant:'tabs-bold',title:'Performans Serisi',count:10}),
  s('video_hero',{variant:'sport-video',heightDesktop:620,autoplay:false,title:'Sınırlarını aş',content:'Hareket için tasarlanan ürünler.',buttonText:'Koleksiyonu gör'}),
  s('product_banner_list',{variant:'banner-right sport',title:'Outdoor Seçkisi',count:6}),
  s('lookbook',{variant:'sport',title:'Ekibini Tamamla',count:4}),
  s('counter',{items:[{value:'42K',title:'Aktif sporcu'},{value:'18',title:'Branş'},{value:'96%',title:'Memnuniyet'}]}),
  ...performanceHome.slice(6)
];

const pantryHome:SectionPreset[]=[
  s('slider',{variant:'pantry',heightDesktop:580,autoplay:true,items:[{subtitle:'TAZE SEÇKİ',title:'Sofranıza iyi gelenler',buttonText:'Alışverişe başla'},{subtitle:'GURME',title:'Özenle seçildi',buttonText:'Koleksiyonu gör'}]}),
  s('ticker_text',{variant:'pantry',items:[{text:'Taze ürünler'},{text:'Güvenli paketleme'},{text:'Hızlı teslimat'}]}),
  s('collection_spotlight',{variant:'round',title:'Lezzet Kategorileri',count:6}),
  s('featured_collection',{variant:'pantry',title:'Kiler Favorileri',count:8}),
  s('discount_banner',{variant:'pantry',title:'Haftanın Sofrası',content:'Seçili ürünlerde avantajlı fiyatlar.'}),
  s('product_banner_list',{variant:'recipe',title:'Kahvaltı Seçkisi',count:6}),
  s('icon_columns',{items:[{title:'Tazelik Garantisi',text:'Özenle seçilir.'},{title:'Güvenli Paket',text:'Koruyucu ambalaj.'},{title:'Hızlı Teslimat',text:'Zamanında kapınızda.'}]}),
  s('blog_posts',{variant:'recipes',title:'Tarifler & Hikâyeler',count:3}),
  s('newsletter',{variant:'pantry',title:'Yeni tatları kaçırmayın'})
];

const tinyHome:SectionPreset[]=[
  s('slider',{variant:'kids',heightDesktop:590,autoplay:true,items:[{subtitle:'MİNİK DÜNYALAR',title:'Oyunla büyüyen mutluluk',buttonText:'Keşfet'},{subtitle:'YENİ',title:'Renkli ve güvenli',buttonText:'İncele'}]}),
  s('collection_list',{variant:'bubbles',title:'Yaşa Göre Keşfet',count:6}),
  s('featured_collection_tabs',{variant:'kids',title:'Minik Favoriler',count:8}),
  s('banner_collage',{variant:'mosaic-3 kids',items:[{title:'Oyun Zamanı'},{title:'Uyku Zamanı'},{title:'Dışarıda'}]}),
  s('icon_columns',{variant:'kids',items:[{title:'Güvenli Ürünler',text:'Çocuklara uygun seçimler.'},{title:'Neşeli Tasarım',text:'Renkli ve yaratıcı.'},{title:'Kolay İade',text:'Ebeveyn dostu süreç.'}]}),
  s('shoppable_feed',{variant:'kids',title:'Mutlu Anlar',count:8}),
  s('testimonials',{variant:'kids',title:'Ebeveynler Ne Diyor?',count:4}),
  s('newsletter',{variant:'kids',title:'Minik sürprizler e-postanıza gelsin'})
];

const forgeHome:SectionPreset[]=[
  s('announcement',{title:'Uyumlu parça bulma · Hızlı sevkiyat · Teknik destek'}),
  s('slider',{variant:'industrial',heightDesktop:520,autoplay:true,items:[{subtitle:'GARAJ İÇİN',title:'Güce hazır olun',buttonText:'Parçaları keşfet'},{subtitle:'PROFESYONEL',title:'İşinize uygun ekipman',buttonText:'İncele'}]}),
  s('popular_categories',{variant:'industrial',title:'Parça Kategorileri',count:10}),
  s('product_vertical_tabs',{variant:'industrial',title:'Aracınıza Uygun Ürünler',count:10}),
  s('product_banner_list',{variant:'industrial',title:'Atölye Ekipmanları',count:6}),
  s('brands_grid',{variant:'industrial',title:'Markalar',count:10}),
  s('tags',{title:'Hızlı Parça Bul'}),
  s('icon_columns',{variant:'industrial',items:[{title:'Uyumluluk Desteği',text:'Doğru parçayı seçin.'},{title:'Hızlı Sevkiyat',text:'Stoktan teslim.'},{title:'Teknik Destek',text:'Uzman ekibe ulaşın.'}]}),
  s('newsletter',{variant:'industrial',title:'Yeni ürün ve stok bildirimleri'})
];

const monoHome:SectionPreset[]=[
  s('slider',{variant:'mono',heightDesktop:760,autoplay:false,items:[{subtitle:'MONO / 01',title:'Görüntü, nesne, fikir.',content:'Tipografik ve cesur bir mağaza deneyimi.',buttonText:'Seçkiyi gör'}]}),
  s('hover_image_list',{variant:'mono',title:'Arşiv',count:5}),
  s('featured_collection',{variant:'mono',title:'Objects / 2026',count:6,columnsDesktop:3}),
  s('ticker_text',{variant:'outline',items:[{text:'FORM'},{text:'FUNCTION'},{text:'MATERIAL'},{text:'SPACE'}]}),
  s('media_collage',{variant:'mono',title:'Studio Notes',content:'Nesneler, insanlar ve üretim süreçleri.'}),
  s('gallery',{variant:'masonry mono',title:'Index',count:8}),
  s('blog_posts',{variant:'mono',title:'Journal',count:3}),
  s('newsletter',{variant:'mono',title:'Notes by email'})
];

const vertexHome:SectionPreset[]=[
  s('announcement',{title:'Bayi fiyatları · Hızlı teklif · Çoklu teslimat'}),
  s('slider',{variant:'b2b',heightDesktop:480,autoplay:true,items:[{subtitle:'İŞİNİZ İÇİN',title:'Toplu alımda akıllı çözüm',buttonText:'Kataloğu incele'},{subtitle:'YENİ STOK',title:'Tedarik sürecinizi hızlandırın',buttonText:'Ürünleri gör'}]}),
  s('category_slider',{variant:'b2b',title:'Sektöre Göre Kategoriler',count:8}),
  s('product_vertical_tabs',{variant:'b2b',title:'Hızlı Sipariş',count:10}),
  s('product_banner_list',{variant:'b2b',title:'Toplu Alım Fırsatları',count:6}),
  s('brands_list',{variant:'b2b',title:'Tedarikçi Markalar',count:12}),
  s('counter',{items:[{value:'12K+',title:'Ürün'},{value:'240+',title:'Marka'},{value:'81',title:'Şehre teslimat'},{value:'7/24',title:'Sipariş'}]}),
  s('accordion',{title:'Kurumsal Satın Alma',items:[{title:'Bayi hesabı nasıl açılır?',text:'Başvuru sonrası işletme bilgileriniz doğrulanır.'},{title:'Teklif alabilir miyim?',text:'Sepetinizden hızlı teklif talebi oluşturabilirsiniz.'},{title:'Çoklu teslimat destekleniyor mu?',text:'Uygun siparişlerde birden fazla teslimat adresi kullanılabilir.'}]}),
  s('newsletter',{variant:'b2b',title:'Stok ve fiyat güncellemelerini alın'})
];

const themes=[
  {slug:'nova-commerce',name:'Ticarti Core',category:'GENEL',desc:'Tam kapsamlı vitrin, mega menü, gelişmiş ürün kartları ve alışveriş bileşenleri.',featured:true,def:true,accent:'#304ffe',radius:20,width:1600,card:'classic',header:'classic',headerTemplate:1,footerTemplate:1,preset:novaHome},
  {slug:'atelier',name:'Atelier',category:'MODA',desc:'Moda ve premium ürünler için editoryal vitrin.',accent:'#111111',radius:0,width:1280,card:'editorial',header:'minimal',headerTemplate:2,footerTemplate:2,preset:atelierHome},
  {slug:'noya',name:'Noya',category:'MINIMAL',desc:'Sade, hızlı ve yüksek boşluklu minimal tasarım.',accent:'#111827',radius:6,width:1200,card:'minimal',header:'centered',headerTemplate:3,footerTemplate:3,preset:noyaHome},
  {slug:'orbit-market',name:'Orbit Market',category:'ELEKTRONİK',desc:'Elektronik ve çok kategorili mağazalar için yoğun bilgi yapısı.',accent:'#1267e8',radius:8,width:1440,card:'dense',header:'search',headerTemplate:4,footerTemplate:1,preset:orbitHome},
  {slug:'casa-linea',name:'Casa Linea',category:'EV & YAŞAM',desc:'Ev, dekorasyon ve mobilya için sıcak ve görsel odaklı tema.',accent:'#77624d',radius:14,width:1360,card:'soft',header:'centered',headerTemplate:3,footerTemplate:4,preset:casaHome},
  {slug:'aurelia',name:'Aurelia',category:'KOZMETİK',desc:'Kozmetik, bakım ve lifestyle markaları için zarif vitrin.',accent:'#b86f7a',radius:18,width:1240,card:'editorial',header:'minimal',headerTemplate:2,footerTemplate:3,preset:aureliaHome},
  {slug:'velo',name:'Velo',category:'SPOR',desc:'Spor, outdoor ve performans ürünleri için dinamik yapı.',accent:'#16a34a',radius:6,width:1360,card:'sport',header:'classic',headerTemplate:1,footerTemplate:5,preset:veloHome},
  {slug:'pantry',name:'Pantry',category:'GIDA',desc:'Gıda, kahve ve gurme ürünleri için sıcak alışveriş deneyimi.',accent:'#b45309',radius:16,width:1260,card:'soft',header:'classic',headerTemplate:1,footerTemplate:4,preset:pantryHome},
  {slug:'tiny-co',name:'Tiny & Co.',category:'ÇOCUK',desc:'Çocuk, bebek ve aile markaları için yumuşak tasarım.',accent:'#7c5cff',radius:20,width:1220,card:'soft',header:'centered',headerTemplate:3,footerTemplate:4,preset:tinyHome},
  {slug:'forge',name:'Forge',category:'OTOMOTİV',desc:'Otomotiv, yedek parça ve teknik ürünler için güçlü katalog.',accent:'#ef4423',radius:4,width:1440,card:'dense',header:'search',headerTemplate:4,footerTemplate:5,preset:forgeHome},
  {slug:'mono-studio',name:'Mono Studio',category:'EDİTORYAL',desc:'İçerik, marka hikâyesi ve seçkiler için tipografik tema.',accent:'#0f172a',radius:0,width:1180,card:'editorial',header:'minimal',headerTemplate:2,footerTemplate:2,preset:monoHome},
  {slug:'vertex-b2b',name:'Vertex B2B',category:'B2B',desc:'Bayi, toptan satış ve geniş ürün tabloları için iş odaklı tema.',accent:'#155e75',radius:6,width:1500,card:'dense',header:'search',headerTemplate:4,footerTemplate:1,preset:vertexHome},
];

function designFor(t:any){
  const productMap:any={
    'nova-commerce':{card:1,page:1,category:1,cols:4},'atelier':{card:2,page:2,category:2,cols:4},'noya':{card:4,page:2,category:2,cols:4},
    'orbit-market':{card:3,page:3,category:3,cols:5},'casa-linea':{card:1,page:4,category:1,cols:4},'aurelia':{card:2,page:2,category:2,cols:4},
    'velo':{card:4,page:3,category:1,cols:4},'pantry':{card:1,page:4,category:1,cols:4},'tiny-co':{card:1,page:4,category:2,cols:4},
    'forge':{card:3,page:3,category:3,cols:5},'mono-studio':{card:2,page:2,category:2,cols:3},'vertex-b2b':{card:3,page:3,category:4,cols:5}
  };
  const headerMap:any={'nova-commerce':1,'atelier':2,'noya':3,'orbit-market':4,'casa-linea':3,'aurelia':2,'velo':5,'pantry':1,'tiny-co':3,'forge':4,'mono-studio':6,'vertex-b2b':4};
  const footerMap:any={'nova-commerce':1,'atelier':2,'noya':3,'orbit-market':1,'casa-linea':4,'aurelia':3,'velo':5,'pantry':4,'tiny-co':4,'forge':5,'mono-studio':2,'vertex-b2b':1};
  const pm=productMap[t.slug]||{card:1,page:1,category:1,cols:4};
  const core=t.slug==='nova-commerce';
  return {general:{bodyFont:'Inter, ui-sans-serif, system-ui, sans-serif',headingFont:'Inter, ui-sans-serif, system-ui, sans-serif',baseFontSize:16,h1Size:t.card==='editorial'?64:52,h2Size:t.card==='editorial'?40:34,h3Size:24,primaryColor:t.accent,secondaryColor:'#747a80',textColor:'#15171a',backgroundColor:'#ffffff',surfaceColor:'#ffffff',borderColor:core?'#d9d9d9':'#e7e7e7',containerWidth:t.width,sectionSpacing:core?100:(t.card==='editorial'?82:64),borderRadius:t.radius,buttonRadius:core?8:Math.min(t.radius,10),customCss:''},header:{template:headerMap[t.slug]||t.headerTemplate,sticky:t.slug!=='mono-studio',topbarEnabled:['orbit-market','forge','vertex-b2b'].includes(t.slug),topbarText:['orbit-market','forge','vertex-b2b'].includes(t.slug)?'Hızlı teslimat · Güvenli ödeme · Kolay iade':'',topbarLink:'',showSearch:core||['orbit-market','forge','vertex-b2b'].includes(t.slug)},footer:{template:footerMap[t.slug]||t.footerTemplate,copyright:'© {{year}} {{store_name}}. Tüm hakları saklıdır.',upperHtml:''},products:{categoryTemplate:pm.category,productPageTemplate:pm.page,productCardTemplate:pm.card,columnsDesktop:pm.cols,columnsTablet:3,columnsMobile:2}};
}

async function main(){
  for(let i=0;i<themes.length;i++){
    const t=themes[i];
    const config={engine:t.slug==='nova-commerce'?'ticarti-core-v1':'ticarti-v3',modules,style:{accent:t.accent,radius:t.radius,containerWidth:t.width,cardStyle:t.card,headerPreset:t.header},design:designFor(t),homePreset:t.preset,performance:{lazySections:true,lazyImages:true,contentVisibility:true,preloadHero:true,animations:'balanced'},seo:{semanticSections:true,breadcrumbSchema:true,productSchema:true},tracking:{dataLayer:true,ecommerceEvents:true}};
    await prisma.themeDefinition.upsert({
      where:{slug:t.slug},
      create:{slug:t.slug,name:t.name,description:t.desc,category:t.category,basePrice:0,currency:'TRY',billingType:'FREE',isActive:true,isFeatured:!!t.featured,isDefault:!!t.def,sortOrder:i,config},
      update:{name:t.name,description:t.desc,category:t.category,basePrice:0,currency:'TRY',billingType:'FREE',isFeatured:!!t.featured,isDefault:!!t.def,sortOrder:i,config}
    });
  }
  await prisma.themeDefinition.updateMany({data:{basePrice:0,billingType:'FREE'}});
  await prisma.themePlanPrice.updateMany({data:{price:0,included:true,isActive:true}});
  const def=await prisma.themeDefinition.findUnique({where:{slug:'nova-commerce'}});
  if(def){
    const tenants=await prisma.tenant.findMany({where:{activeTheme:{in:['default','']}}});
    for(const tenant of tenants){await prisma.tenant.update({where:{id:tenant.id},data:{activeTheme:def.slug}});await prisma.themeInstallation.upsert({where:{tenantId_themeId:{tenantId:tenant.id,themeId:def.id}},create:{tenantId:tenant.id,themeId:def.id,status:'ACTIVE',source:'SYSTEM',purchasedPrice:0,currency:'TRY',activatedAt:new Date()},update:{status:'ACTIVE'}})}
    const coreTenants=await prisma.tenant.findMany({where:{activeTheme:def.slug},select:{id:true,settings:true}});
    for(const tenant of coreTenants){
      const settings:any=tenant.settings||{};
      if(settings.themeRuntimeVersion==='ticarti-core-v1')continue;
      await prisma.$transaction(async tx=>{
        await tx.siteSection.deleteMany({where:{storeId:tenant.id,pageKey:'home'}});
        await tx.siteSection.createMany({data:novaHome.map((section,index)=>({storeId:tenant.id,pageKey:'home',sectionType:section.sectionType,sortOrder:index,enabled:section.enabled!==false,settings:section.settings}))});
        await tx.tenant.update({where:{id:tenant.id},data:{settings:{...settings,design:designFor(themes[0]),themeRuntimeVersion:'ticarti-core-v1'}}});
      });
    }
  }
  console.log(`[theme-catalog] ${themes.length} tema ve gerçek storefront presetleri hazır`);
}
main().finally(()=>prisma.$disconnect());
