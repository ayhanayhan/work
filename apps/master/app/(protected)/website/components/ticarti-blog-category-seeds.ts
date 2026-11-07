/** Ticarti blog categories for the five Master Panel languages: tr, en, de, ru, ar.
 * Import fills blank fields and keeps existing editor changes.
 */
export type SeedCategory={id:string;translations:Record<string,{title:string;slug:string;description:string;seoTitle:string;seoDescription:string}>};
export const ticartiBlogCategorySeeds:SeedCategory[]=[
  {
    "id": "e-ticaret",
    "translations": {
      "tr": {
        "title": "E-Ticaret",
        "slug": "e-ticaret",
        "description": "E-ticarete başlamak, online mağaza kurmak ve internetten satış yapmak isteyenler için kapsamlı bilgiler. E-ticaretin temellerinden mağaza yönetimine, ürün satışından müşteri deneyimine kadar merak ettiğiniz tüm konuları keşfedin.",
        "seoTitle": "E-Ticaret Nedir? E-Ticaret Rehberleri | Ticarti",
        "seoDescription": "E-ticarete nasıl başlanır? Online mağaza kurma, internetten satış yapma ve e-ticaret yönetimi hakkında rehberleri ve ipuçlarını keşfedin."
      },
      "en": {
        "title": "E-Commerce",
        "slug": "e-commerce",
        "description": "Explore practical guides to starting an e-commerce business, building an online store and selling online. Learn the essentials of store management, product sales and customer experience.",
        "seoTitle": "What Is E-Commerce? E-Commerce Guides | Ticarti",
        "seoDescription": "Learn how to start an e-commerce business, build an online store, sell products online and manage your store with practical guides."
      },
      "ru": {
        "title": "Электронная коммерция",
        "slug": "elektronnaya-kommertsiya",
        "description": "Полезные материалы для тех, кто хочет начать онлайн-продажи и открыть интернет-магазин. Узнайте об основах электронной коммерции, управлении магазином, товарах и клиентском опыте.",
        "seoTitle": "Что такое электронная коммерция? Руководства | Ticarti",
        "seoDescription": "Как открыть интернет-магазин и начать онлайн-продажи? Руководства по электронной коммерции и управлению магазином."
      },
      "de": {
        "title": "E-Commerce",
        "slug": "e-commerce",
        "description": "Umfassende Ratgeber für alle, die in den E-Commerce einsteigen, einen Onlineshop eröffnen und im Internet verkaufen möchten. Entdecken Sie Grundlagen des Onlinehandels, Shopverwaltung, Produktverkauf und Kundenerlebnis.",
        "seoTitle": "Was ist E-Commerce? E-Commerce-Ratgeber | Ticarti",
        "seoDescription": "Wie startet man im E-Commerce? Entdecken Sie Tipps und Ratgeber zum Aufbau eines Onlineshops, Onlineverkauf und Shopmanagement."
      },
      "ar": {
        "title": "التجارة الإلكترونية",
        "slug": "al-tijara-al-iliktruniya",
        "description": "أدلة شاملة للراغبين في بدء التجارة الإلكترونية وإنشاء متجر إلكتروني والبيع عبر الإنترنت. اكتشف أساسيات التجارة الإلكترونية وإدارة المتجر وبيع المنتجات وتحسين تجربة العملاء.",
        "seoTitle": "ما هي التجارة الإلكترونية؟ أدلة التجارة الإلكترونية | Ticarti",
        "seoDescription": "كيف تبدأ التجارة الإلكترونية؟ اكتشف أدلة إنشاء متجر إلكتروني والبيع عبر الإنترنت وإدارة المتجر ونصائح عملية."
      }
    }
  },
  {
    "id": "dijital-pazarlama",
    "translations": {
      "tr": {
        "title": "Dijital Pazarlama",
        "slug": "dijital-pazarlama",
        "description": "Dijital dünyada markanızı büyütmek ve daha fazla müşteriye ulaşmak için etkili pazarlama stratejilerini keşfedin. SEO, Google Ads, sosyal medya reklamları, e-posta pazarlaması ve dönüşüm optimizasyonu hakkında rehberler.",
        "seoTitle": "Dijital Pazarlama Stratejileri ve Rehberleri | Ticarti",
        "seoDescription": "SEO, Google Ads, sosyal medya reklamları ve dijital pazarlama stratejileriyle e-ticaret sitenizin ziyaretçi sayısını ve satışlarını artırın."
      },
      "en": {
        "title": "Digital Marketing",
        "slug": "digital-marketing",
        "description": "Discover strategies to grow your brand and reach more customers online. Read guides to SEO, Google Ads, social media advertising, email marketing and conversion rate optimization.",
        "seoTitle": "Digital Marketing Strategies and Guides | Ticarti",
        "seoDescription": "Grow your online store's traffic and sales with SEO, Google Ads, social media advertising and effective digital marketing strategies."
      },
      "ru": {
        "title": "Цифровой маркетинг",
        "slug": "tsifrovoy-marketing",
        "description": "Узнайте, как развивать бренд и привлекать клиентов в интернете. Руководства по SEO, Google Ads, рекламе в социальных сетях, email-маркетингу и оптимизации конверсии.",
        "seoTitle": "Цифровой маркетинг: стратегии и руководства | Ticarti",
        "seoDescription": "Увеличивайте трафик и продажи интернет-магазина с помощью SEO, Google Ads, рекламы в соцсетях и цифрового маркетинга."
      },
      "de": {
        "title": "Digitales Marketing",
        "slug": "digitales-marketing",
        "description": "Entdecken Sie wirksame Marketingstrategien, um Ihre Marke online aufzubauen und mehr Kunden zu erreichen. Ratgeber zu SEO, Google Ads, Social-Media-Werbung, E-Mail-Marketing und Conversion-Optimierung.",
        "seoTitle": "Digitales Marketing: Strategien und Ratgeber | Ticarti",
        "seoDescription": "Steigern Sie Besucherzahlen und Verkäufe Ihres Onlineshops mit SEO, Google Ads, Social-Media-Werbung und digitalen Marketingstrategien."
      },
      "ar": {
        "title": "التسويق الرقمي",
        "slug": "al-taswiq-al-raqami",
        "description": "اكتشف استراتيجيات تسويق فعالة لتنمية علامتك التجارية والوصول إلى المزيد من العملاء عبر الإنترنت. أدلة حول تحسين محركات البحث وإعلانات Google والتواصل الاجتماعي والبريد الإلكتروني وتحسين التحويلات.",
        "seoTitle": "استراتيجيات التسويق الرقمي وأدلته | Ticarti",
        "seoDescription": "زد زيارات متجرك الإلكتروني ومبيعاته باستخدام تحسين محركات البحث وإعلانات Google ووسائل التواصل واستراتيجيات التسويق الرقمي."
      }
    }
  },
  {
    "id": "pazaryerleri",
    "translations": {
      "tr": {
        "title": "Pazaryerleri",
        "slug": "pazaryerleri",
        "description": "Trendyol, Hepsiburada, Amazon, n11 ve diğer pazaryerlerinde satış yapmak isteyenler için rehberler. Komisyon oranları, mağaza açılışı, ürün listeleme, kampanya yönetimi ve pazaryeri entegrasyonları hakkında bilgiler.",
        "seoTitle": "Pazaryerleri, Komisyonlar ve Satış Rehberi | Ticarti",
        "seoDescription": "Trendyol, Hepsiburada, Amazon ve n11 satış rehberleri. Pazaryeri komisyonları, mağaza yönetimi ve entegrasyonlar hakkında bilgi edinin."
      },
      "en": {
        "title": "Marketplaces",
        "slug": "marketplaces",
        "description": "Guides to selling on Trendyol, Hepsiburada, Amazon, n11 and other marketplaces. Explore commission fees, seller account setup, product listings, promotions and marketplace integrations.",
        "seoTitle": "Marketplace Selling and Commission Guides | Ticarti",
        "seoDescription": "Learn how to sell on Trendyol, Hepsiburada, Amazon and n11, including commissions, seller tools and marketplace integrations."
      },
      "ru": {
        "title": "Маркетплейсы",
        "slug": "marketpleysy",
        "description": "Руководства по продажам на Trendyol, Hepsiburada, Amazon, n11 и других площадках. Комиссии, открытие магазина, размещение товаров, акции и интеграции маркетплейсов.",
        "seoTitle": "Маркетплейсы: комиссии и руководство по продажам | Ticarti",
        "seoDescription": "Продажи на Trendyol, Hepsiburada, Amazon и n11: комиссии, управление магазином и интеграции с маркетплейсами."
      },
      "de": {
        "title": "Online-Marktplätze",
        "slug": "online-marktplaetze",
        "description": "Ratgeber für den Verkauf auf Trendyol, Hepsiburada, Amazon, n11 und weiteren Online-Marktplätzen. Informationen zu Provisionen, Händlerkonten, Produktlistings, Aktionen und Marktplatz-Integrationen.",
        "seoTitle": "Online-Marktplätze: Provisionen und Verkaufsratgeber | Ticarti",
        "seoDescription": "Erfahren Sie mehr über den Verkauf auf Trendyol, Hepsiburada, Amazon und n11 sowie Provisionen, Shopverwaltung und Integrationen."
      },
      "ar": {
        "title": "الأسواق الإلكترونية",
        "slug": "al-aswaq-al-iliktruniya",
        "description": "أدلة للبيع عبر Trendyol وHepsiburada وAmazon وn11 وغيرها من الأسواق الإلكترونية. تعرّف إلى العمولات وفتح حساب البائع وإدراج المنتجات وإدارة الحملات والتكاملات.",
        "seoTitle": "الأسواق الإلكترونية والعمولات ودليل البيع | Ticarti",
        "seoDescription": "أدلة البيع عبر Trendyol وHepsiburada وAmazon وn11، ومعلومات عن العمولات وإدارة المتاجر والتكاملات."
      }
    }
  },
  {
    "id": "kargo-ve-lojistik",
    "translations": {
      "tr": {
        "title": "Kargo ve Lojistik",
        "slug": "kargo-ve-lojistik",
        "description": "E-ticarette kargo gönderimi, lojistik süreçleri ve teslimat yönetimi hakkında bilmeniz gerekenler. Kargo anlaşmaları, gönderim maliyetleri, depo yönetimi, paketleme, stok takibi ve iade süreçlerine yönelik rehberler.",
        "seoTitle": "E-Ticarette Kargo ve Lojistik Rehberleri | Ticarti",
        "seoDescription": "E-ticarette kargo anlaşmaları, gönderim ücretleri, depo yönetimi, teslimat ve iade süreçleri hakkında pratik bilgiler ve rehberler."
      },
      "en": {
        "title": "Shipping and Logistics",
        "slug": "shipping-and-logistics",
        "description": "Everything you need to know about shipping, logistics and delivery management for online stores. Explore carrier agreements, shipping costs, warehousing, packaging, inventory and returns.",
        "seoTitle": "E-Commerce Shipping and Logistics Guides | Ticarti",
        "seoDescription": "Practical guides to shipping contracts, delivery costs, warehouse management and returns for e-commerce businesses."
      },
      "ru": {
        "title": "Доставка и логистика",
        "slug": "dostavka-i-logistika",
        "description": "Всё о доставке, логистике и управлении заказами в электронной коммерции. Тарифы и договоры с перевозчиками, склады, упаковка, учёт запасов и возвраты.",
        "seoTitle": "Доставка и логистика в электронной коммерции | Ticarti",
        "seoDescription": "Практические советы по тарифам доставки, работе со складами, упаковке заказов и обработке возвратов."
      },
      "de": {
        "title": "Versand und Logistik",
        "slug": "versand-und-logistik",
        "description": "Alles Wissenswerte über Versand, Logistik und Liefermanagement im E-Commerce. Ratgeber zu Versandverträgen, Versandkosten, Lagerverwaltung, Verpackung, Beständen und Retouren.",
        "seoTitle": "Versand und Logistik im E-Commerce | Ticarti",
        "seoDescription": "Praktische Ratgeber zu Versandverträgen, Lieferkosten, Lagerverwaltung, Zustellung und Retouren im Onlinehandel."
      },
      "ar": {
        "title": "الشحن والخدمات اللوجستية",
        "slug": "al-shahn-wa-al-khadamat-al-lujistiya",
        "description": "تعرّف إلى الشحن والخدمات اللوجستية وإدارة التسليم في التجارة الإلكترونية. أدلة حول اتفاقيات شركات الشحن وتكاليف الإرسال والمستودعات والتغليف والمخزون والمرتجعات.",
        "seoTitle": "الشحن والخدمات اللوجستية في التجارة الإلكترونية | Ticarti",
        "seoDescription": "أدلة عملية حول اتفاقيات الشحن وتكاليف التوصيل وإدارة المستودعات وعمليات التسليم والإرجاع في التجارة الإلكترونية."
      }
    }
  },
  {
    "id": "odeme-sistemleri",
    "translations": {
      "tr": {
        "title": "Ödeme Sistemleri",
        "slug": "odeme-sistemleri",
        "description": "E-ticaret sitelerinde güvenli ve kolay ödeme almanın yollarını keşfedin. Sanal POS, kredi kartı ile ödeme, taksitli satış, ödeme kuruluşları, komisyon oranları ve online ödeme altyapıları hakkında bilgiler.",
        "seoTitle": "E-Ticaret Ödeme Sistemleri ve Sanal POS | Ticarti",
        "seoDescription": "Sanal POS, online ödeme altyapıları, kredi kartı ile ödeme, taksit seçenekleri ve ödeme sistemi komisyonları hakkında rehberleri inceleyin."
      },
      "en": {
        "title": "Payment Systems",
        "slug": "payment-systems",
        "description": "Learn how to accept secure, convenient payments in your online store. Explore virtual POS, card payments, installments, payment providers, transaction fees and online payment infrastructure.",
        "seoTitle": "E-Commerce Payment Systems and Virtual POS | Ticarti",
        "seoDescription": "Guides to virtual POS, online payment gateways, credit cards, installment payments and payment processing fees."
      },
      "ru": {
        "title": "Платёжные системы",
        "slug": "platezhnye-sistemy",
        "description": "Как безопасно и удобно принимать оплату в интернет-магазине. Виртуальные POS-терминалы, банковские карты, рассрочка, платёжные провайдеры и комиссии.",
        "seoTitle": "Платёжные системы и виртуальный POS | Ticarti",
        "seoDescription": "Руководства по виртуальным POS, онлайн-платежам, банковским картам, рассрочке и комиссиям платёжных систем."
      },
      "de": {
        "title": "Zahlungssysteme",
        "slug": "zahlungssysteme",
        "description": "Entdecken Sie sichere und einfache Zahlungsmöglichkeiten für Onlineshops. Informationen zu virtuellen POS-Systemen, Kartenzahlungen, Ratenzahlung, Zahlungsdienstleistern, Provisionen und Online-Zahlungsinfrastruktur.",
        "seoTitle": "E-Commerce-Zahlungssysteme und virtuelles POS | Ticarti",
        "seoDescription": "Ratgeber zu virtuellen POS-Systemen, Onlinezahlungen, Kreditkarten, Ratenzahlung und Gebühren von Zahlungsanbietern."
      },
      "ar": {
        "title": "أنظمة الدفع",
        "slug": "anzimat-al-daf",
        "description": "اكتشف طرق قبول المدفوعات بأمان وسهولة في المتاجر الإلكترونية. معلومات عن نقاط البيع الافتراضية وبطاقات الائتمان والتقسيط ومزودي خدمات الدفع والعمولات وبوابات الدفع.",
        "seoTitle": "أنظمة الدفع ونقاط البيع الافتراضية للتجارة الإلكترونية | Ticarti",
        "seoDescription": "أدلة حول نقاط البيع الافتراضية والدفع عبر الإنترنت وبطاقات الائتمان والتقسيط وعمولات خدمات الدفع."
      }
    }
  },
  {
    "id": "vergi-ve-yasal-surecler",
    "translations": {
      "tr": {
        "title": "Vergi ve Yasal Süreçler",
        "slug": "vergi-ve-yasal-surecler",
        "description": "E-ticaret işletmelerinin karşılaşabileceği vergi, şirket kuruluşu ve yasal yükümlülükler hakkında bilgilendirici içerikler. E-fatura, e-arşiv, mesafeli satış sözleşmeleri, KVKK ve e-ticaret mevzuatını anlaşılır rehberlerle keşfedin.",
        "seoTitle": "E-Ticarette Vergi ve Yasal Süreçler | Ticarti",
        "seoDescription": "E-ticarette şirket kuruluşu, vergi yükümlülükleri, e-fatura, KVKK ve mesafeli satış sözleşmeleri hakkında bilgilendirici rehberler."
      },
      "en": {
        "title": "Tax and Legal Requirements",
        "slug": "tax-and-legal-requirements",
        "description": "Understand tax obligations, company formation and legal requirements for e-commerce businesses. Explore e-invoicing, e-archives, distance selling contracts, KVKK and relevant regulations.",
        "seoTitle": "E-Commerce Taxes and Legal Requirements | Ticarti",
        "seoDescription": "Guides to company formation, taxes, e-invoicing, KVKK data protection and distance selling contracts for online businesses."
      },
      "ru": {
        "title": "Налоги и правовые вопросы",
        "slug": "nalogi-i-pravovye-voprosy",
        "description": "Информация о налогах, регистрации компании и юридических обязанностях интернет-магазинов. Электронные счета, архивы, договоры дистанционной продажи, защита данных и законодательство.",
        "seoTitle": "Налоги и правовые вопросы электронной торговли | Ticarti",
        "seoDescription": "Руководства по регистрации бизнеса, налогам, электронным счетам, защите данных и договорам дистанционной продажи."
      },
      "de": {
        "title": "Steuern und Rechtliches",
        "slug": "steuern-und-rechtliches",
        "description": "Verständliche Informationen zu Steuern, Unternehmensgründung und rechtlichen Pflichten im E-Commerce. Entdecken Sie Ratgeber zu E-Rechnungen, elektronischer Archivierung, Fernabsatzverträgen, KVKK und Handelsvorschriften.",
        "seoTitle": "Steuern und rechtliche Pflichten im E-Commerce | Ticarti",
        "seoDescription": "Ratgeber zu Unternehmensgründung, Steuern, E-Rechnungen, Datenschutz nach KVKK und Fernabsatzverträgen im Onlinehandel."
      },
      "ar": {
        "title": "الضرائب والإجراءات القانونية",
        "slug": "al-daraib-wa-al-ijraat-al-qanuniya",
        "description": "محتوى توضيحي حول الضرائب وتأسيس الشركات والالتزامات القانونية للتجارة الإلكترونية. أدلة عن الفواتير الإلكترونية والأرشفة والعقود عن بُعد وقانون حماية البيانات KVKK والتشريعات.",
        "seoTitle": "الضرائب والإجراءات القانونية في التجارة الإلكترونية | Ticarti",
        "seoDescription": "أدلة حول تأسيس الشركات والالتزامات الضريبية والفواتير الإلكترونية وحماية البيانات KVKK وعقود البيع عن بُعد."
      }
    }
  },
  {
    "id": "girisimcilik",
    "translations": {
      "tr": {
        "title": "Girişimcilik",
        "slug": "girisimcilik",
        "description": "Kendi işini kurmak, yeni bir marka oluşturmak ve girişimini büyütmek isteyenler için fikirler ve rehberler. İş modelleri, sermaye planlaması, ürün seçimi, markalaşma ve sürdürülebilir büyüme stratejilerini keşfedin.",
        "seoTitle": "Girişimcilik, İş Fikirleri ve Büyüme | Ticarti",
        "seoDescription": "Yeni iş fikirleri, girişimcilik rehberleri, marka oluşturma, sermaye planlaması ve işinizi büyütmeye yönelik stratejileri keşfedin."
      },
      "en": {
        "title": "Entrepreneurship",
        "slug": "entrepreneurship",
        "description": "Ideas and guides for starting a business, building a new brand and growing a venture. Explore business models, budgeting, product selection, branding and sustainable growth strategies.",
        "seoTitle": "Entrepreneurship, Business Ideas and Growth | Ticarti",
        "seoDescription": "Discover business ideas, entrepreneurship guides, brand building, financial planning and strategies for growing your business."
      },
      "ru": {
        "title": "Предпринимательство",
        "slug": "predprinimatelstvo",
        "description": "Идеи и руководства для тех, кто хочет открыть бизнес, создать бренд и развивать своё дело. Бизнес-модели, финансовое планирование, выбор продуктов, брендинг и устойчивый рост.",
        "seoTitle": "Предпринимательство, бизнес-идеи и рост | Ticarti",
        "seoDescription": "Бизнес-идеи, создание бренда, финансовое планирование и практические стратегии развития собственного дела."
      },
      "de": {
        "title": "Unternehmertum",
        "slug": "unternehmertum",
        "description": "Ideen und Ratgeber für alle, die ein eigenes Unternehmen gründen, eine Marke aufbauen und ihr Geschäft ausbauen möchten. Entdecken Sie Geschäftsmodelle, Kapitalplanung, Produktauswahl, Markenbildung und nachhaltiges Wachstum.",
        "seoTitle": "Unternehmertum, Geschäftsideen und Wachstum | Ticarti",
        "seoDescription": "Entdecken Sie Geschäftsideen, Gründer-Ratgeber, Markenaufbau, Kapitalplanung und Strategien für nachhaltiges Unternehmenswachstum."
      },
      "ar": {
        "title": "ريادة الأعمال",
        "slug": "riyadat-al-aamal",
        "description": "أفكار وأدلة للراغبين في تأسيس أعمالهم الخاصة وبناء علامة تجارية وتنمية مشاريعهم. اكتشف نماذج الأعمال وتخطيط رأس المال واختيار المنتجات وبناء العلامات واستراتيجيات النمو المستدام.",
        "seoTitle": "ريادة الأعمال وأفكار المشاريع والنمو | Ticarti",
        "seoDescription": "استكشف أفكار المشاريع وأدلة ريادة الأعمال وبناء العلامات التجارية والتخطيط المالي واستراتيجيات تنمية الأعمال."
      }
    }
  },
  {
    "id": "ticarti-haberleri",
    "translations": {
      "tr": {
        "title": "Ticarti Haberleri",
        "slug": "ticarti-haberleri",
        "description": "Ticarti dünyasındaki yenilikleri ve gelişmeleri yakından takip edin. Yeni platform özellikleri, entegrasyonlar, ürün güncellemeleri, duyurular ve Ticarti ile e-ticaret deneyiminizi geliştirecek haberler.",
        "seoTitle": "Ticarti Haberleri, Duyurular ve Yenilikler",
        "seoDescription": "Ticarti'nin yeni özellikleri, entegrasyon duyuruları, platform güncellemeleri ve e-ticaret deneyiminizi geliştirecek tüm yenilikler."
      },
      "en": {
        "title": "Ticarti News",
        "slug": "ticarti-news",
        "description": "Follow the latest updates from Ticarti. Discover new platform features, integrations, product improvements, announcements and news that help you get more from e-commerce.",
        "seoTitle": "Ticarti News, Announcements and Updates",
        "seoDescription": "Discover Ticarti's new features, integration announcements, platform updates and other e-commerce product news."
      },
      "ru": {
        "title": "Новости Ticarti",
        "slug": "novosti-ticarti",
        "description": "Следите за обновлениями Ticarti. Новые функции платформы, интеграции, обновления продуктов, объявления и новости, которые помогут вам развивать интернет-торговлю.",
        "seoTitle": "Новости Ticarti: обновления и объявления",
        "seoDescription": "Новые функции Ticarti, анонсы интеграций, обновления платформы и новости для развития онлайн-бизнеса."
      },
      "de": {
        "title": "Ticarti-Neuigkeiten",
        "slug": "ticarti-neuigkeiten",
        "description": "Bleiben Sie über alle Entwicklungen bei Ticarti informiert. Entdecken Sie neue Plattformfunktionen, Integrationen, Produktupdates, Ankündigungen und Neuigkeiten rund um Ihren E-Commerce-Alltag.",
        "seoTitle": "Ticarti-News, Ankündigungen und Neuerungen",
        "seoDescription": "Neuigkeiten zu Ticarti-Funktionen, Integrationen, Plattformupdates und Verbesserungen für Ihren Onlinehandel."
      },
      "ar": {
        "title": "أخبار Ticarti",
        "slug": "akhbar-ticarti",
        "description": "تابع أحدث أخبار Ticarti وتطوراتها. اكتشف ميزات المنصة الجديدة والتكاملات وتحديثات المنتجات والإعلانات والأخبار التي تساعدك على تطوير تجارتك الإلكترونية.",
        "seoTitle": "أخبار Ticarti والإعلانات والتحديثات",
        "seoDescription": "تعرّف إلى ميزات Ticarti الجديدة وإعلانات التكاملات وتحديثات المنصة وكل ما يساعدك على تحسين تجربة التجارة الإلكترونية."
      }
    }
  }
];
