/** The four languages shown in Ticarti Master: Turkish, English, Portuguese, Russian.
 * Preserve existing saved edits when importing; no unrelated language is seeded.
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
      "pt": {
        "title": "Comércio Eletrónico",
        "slug": "comercio-eletronico",
        "description": "Descubra guias completos para começar no comércio eletrónico, criar uma loja online e vender na internet. Explore os fundamentos, a gestão da loja, as vendas e a experiência do cliente.",
        "seoTitle": "O Que É Comércio Eletrónico? Guias | Ticarti",
        "seoDescription": "Saiba como começar a vender online, criar uma loja virtual e gerir o seu negócio de comércio eletrónico com guias e dicas."
      },
      "ru": {
        "title": "Электронная коммерция",
        "slug": "elektronnaya-kommertsiya",
        "description": "Полезные материалы для тех, кто хочет начать онлайн-продажи и открыть интернет-магазин. Узнайте об основах электронной коммерции, управлении магазином, товарах и клиентском опыте.",
        "seoTitle": "Что такое электронная коммерция? Руководства | Ticarti",
        "seoDescription": "Как открыть интернет-магазин и начать онлайн-продажи? Руководства по электронной коммерции и управлению магазином."
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
      "pt": {
        "title": "Marketing Digital",
        "slug": "marketing-digital",
        "description": "Descubra estratégias eficazes para fazer crescer a sua marca e alcançar mais clientes. Explore guias sobre SEO, Google Ads, anúncios nas redes sociais, email marketing e otimização de conversões.",
        "seoTitle": "Estratégias e Guias de Marketing Digital | Ticarti",
        "seoDescription": "Aumente as visitas e as vendas da sua loja online com SEO, Google Ads, redes sociais e estratégias de marketing digital."
      },
      "ru": {
        "title": "Цифровой маркетинг",
        "slug": "tsifrovoy-marketing",
        "description": "Узнайте, как развивать бренд и привлекать клиентов в интернете. Руководства по SEO, Google Ads, рекламе в социальных сетях, email-маркетингу и оптимизации конверсии.",
        "seoTitle": "Цифровой маркетинг: стратегии и руководства | Ticarti",
        "seoDescription": "Увеличивайте трафик и продажи интернет-магазина с помощью SEO, Google Ads, рекламы в соцсетях и цифрового маркетинга."
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
      "pt": {
        "title": "Marketplaces",
        "slug": "marketplaces",
        "description": "Guias para vender na Trendyol, Hepsiburada, Amazon, n11 e outros marketplaces. Informações sobre comissões, criação de contas de vendedor, listagem de produtos, campanhas e integrações.",
        "seoTitle": "Marketplaces: Comissões e Guias de Vendas | Ticarti",
        "seoDescription": "Saiba como vender na Trendyol, Hepsiburada, Amazon e n11. Comissões, gestão de lojas e integrações de marketplaces."
      },
      "ru": {
        "title": "Маркетплейсы",
        "slug": "marketpleysy",
        "description": "Руководства по продажам на Trendyol, Hepsiburada, Amazon, n11 и других площадках. Комиссии, открытие магазина, размещение товаров, акции и интеграции маркетплейсов.",
        "seoTitle": "Маркетплейсы: комиссии и руководство по продажам | Ticarti",
        "seoDescription": "Продажи на Trendyol, Hepsiburada, Amazon и n11: комиссии, управление магазином и интеграции с маркетплейсами."
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
      "pt": {
        "title": "Envios e Logística",
        "slug": "envios-e-logistica",
        "description": "Tudo o que precisa de saber sobre envios, logística e gestão de entregas no comércio eletrónico. Guias sobre transportadoras, custos, armazéns, embalagens, stocks e devoluções.",
        "seoTitle": "Guias de Envios e Logística no E-Commerce | Ticarti",
        "seoDescription": "Guias práticos sobre contratos com transportadoras, custos de envio, gestão de armazéns, entregas e devoluções."
      },
      "ru": {
        "title": "Доставка и логистика",
        "slug": "dostavka-i-logistika",
        "description": "Всё о доставке, логистике и управлении заказами в электронной коммерции. Тарифы и договоры с перевозчиками, склады, упаковка, учёт запасов и возвраты.",
        "seoTitle": "Доставка и логистика в электронной коммерции | Ticarti",
        "seoDescription": "Практические советы по тарифам доставки, работе со складами, упаковке заказов и обработке возвратов."
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
      "pt": {
        "title": "Sistemas de Pagamento",
        "slug": "sistemas-de-pagamento",
        "description": "Descubra como aceitar pagamentos seguros e simples na sua loja online. Saiba mais sobre POS virtual, cartões, prestações, prestadores de pagamentos, comissões e soluções de pagamento online.",
        "seoTitle": "Sistemas de Pagamento e POS Virtual | Ticarti",
        "seoDescription": "Guias sobre POS virtual, pagamentos online, cartões de crédito, prestações e comissões de processamento de pagamentos."
      },
      "ru": {
        "title": "Платёжные системы",
        "slug": "platezhnye-sistemy",
        "description": "Как безопасно и удобно принимать оплату в интернет-магазине. Виртуальные POS-терминалы, банковские карты, рассрочка, платёжные провайдеры и комиссии.",
        "seoTitle": "Платёжные системы и виртуальный POS | Ticarti",
        "seoDescription": "Руководства по виртуальным POS, онлайн-платежам, банковским картам, рассрочке и комиссиям платёжных систем."
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
      "pt": {
        "title": "Impostos e Obrigações Legais",
        "slug": "impostos-e-obrigacoes-legais",
        "description": "Informações sobre impostos, criação de empresas e obrigações legais no comércio eletrónico. Explore faturação eletrónica, arquivo digital, contratos de venda à distância, proteção de dados e legislação.",
        "seoTitle": "Impostos e Obrigações Legais no E-Commerce | Ticarti",
        "seoDescription": "Guias informativos sobre criação de empresas, impostos, faturação eletrónica, proteção de dados e contratos de venda online."
      },
      "ru": {
        "title": "Налоги и правовые вопросы",
        "slug": "nalogi-i-pravovye-voprosy",
        "description": "Информация о налогах, регистрации компании и юридических обязанностях интернет-магазинов. Электронные счета, архивы, договоры дистанционной продажи, защита данных и законодательство.",
        "seoTitle": "Налоги и правовые вопросы электронной торговли | Ticarti",
        "seoDescription": "Руководства по регистрации бизнеса, налогам, электронным счетам, защите данных и договорам дистанционной продажи."
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
      "pt": {
        "title": "Empreendedorismo",
        "slug": "empreendedorismo",
        "description": "Ideias e guias para criar o seu negócio, lançar uma marca e fazer crescer o projeto. Explore modelos de negócio, planeamento financeiro, escolha de produtos, branding e crescimento sustentável.",
        "seoTitle": "Empreendedorismo, Ideias de Negócio e Crescimento | Ticarti",
        "seoDescription": "Descubra ideias de negócio, guias de empreendedorismo, criação de marcas, planeamento financeiro e estratégias de crescimento."
      },
      "ru": {
        "title": "Предпринимательство",
        "slug": "predprinimatelstvo",
        "description": "Идеи и руководства для тех, кто хочет открыть бизнес, создать бренд и развивать своё дело. Бизнес-модели, финансовое планирование, выбор продуктов, брендинг и устойчивый рост.",
        "seoTitle": "Предпринимательство, бизнес-идеи и рост | Ticarti",
        "seoDescription": "Бизнес-идеи, создание бренда, финансовое планирование и практические стратегии развития собственного дела."
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
      "pt": {
        "title": "Notícias Ticarti",
        "slug": "noticias-ticarti",
        "description": "Acompanhe as novidades da Ticarti. Descubra novas funcionalidades, integrações, atualizações de produtos, anúncios e notícias que melhoram a sua experiência de comércio eletrónico.",
        "seoTitle": "Notícias, Anúncios e Novidades Ticarti",
        "seoDescription": "Novas funcionalidades da Ticarti, anúncios de integrações, atualizações da plataforma e novidades do comércio eletrónico."
      },
      "ru": {
        "title": "Новости Ticarti",
        "slug": "novosti-ticarti",
        "description": "Следите за обновлениями Ticarti. Новые функции платформы, интеграции, обновления продуктов, объявления и новости, которые помогут вам развивать интернет-торговлю.",
        "seoTitle": "Новости Ticarti: обновления и объявления",
        "seoDescription": "Новые функции Ticarti, анонсы интеграций, обновления платформы и новости для развития онлайн-бизнеса."
      }
    }
  }
];
