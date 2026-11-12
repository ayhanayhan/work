-- Ticarti v33.0.23 app platform cleanup + help center
-- Remove only platform/demo catalog entries. Relations use ON DELETE CASCADE where applicable.
DELETE FROM "AppDefinition"
WHERE "developerOrgId" IS NULL
  AND "slug" IN (
    'whatsapp-ai','google-shopping','meta-pixel','google-analytics-4','google-tag-manager','sms',
    'trendyol','hepsiburada','n11','amazon','pazarama','ciceksepeti','pttavm',
    'kargo-yurtici','kargo-aras','kargo-mng','kargo-surat','kargo-ptt',
    'fatura-parasut','fatura-logo','fatura-mikro','fatura-nebim',
    'odeme-iyzico','odeme-paytr','odeme-param','odeme-sipay','odeme-stripe'
  );

CREATE TABLE IF NOT EXISTS "HelpCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "translations" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "HelpCategory_slug_key" ON "HelpCategory"("slug");
CREATE INDEX IF NOT EXISTS "HelpCategory_isActive_sortOrder_idx" ON "HelpCategory"("isActive","sortOrder");

CREATE TABLE IF NOT EXISTS "HelpArticle" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT,
  "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "translations" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "helpfulYes" INTEGER NOT NULL DEFAULT 0,
  "helpfulNo" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HelpArticle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HelpArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HelpCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "HelpArticle_slug_key" ON "HelpArticle"("slug");
CREATE INDEX IF NOT EXISTS "HelpArticle_categoryId_status_sortOrder_idx" ON "HelpArticle"("categoryId","status","sortOrder");
CREATE INDEX IF NOT EXISTS "HelpArticle_status_updatedAt_idx" ON "HelpArticle"("status","updatedAt");

INSERT INTO "HelpCategory" ("id","slug","translations","sortOrder","isActive","createdAt","updatedAt") VALUES
('help_getting_started','baslangic','{"tr":{"title":"Başlangıç","description":"Ticarti mağazanızı kurmaya başlayın."},"en":{"title":"Getting started","description":"Start setting up your Ticarti store."},"de":{"title":"Erste Schritte","description":"Richten Sie Ihren Ticarti-Shop ein."},"ru":{"title":"Начало работы","description":"Начните настройку магазина Ticarti."}}'::jsonb,10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('help_products','urunler','{"tr":{"title":"Ürünler ve stok","description":"Ürün, varyant, stok ve depo yönetimi."},"en":{"title":"Products and inventory","description":"Products, variants, inventory and warehouses."},"de":{"title":"Produkte und Bestand","description":"Produkte, Varianten, Bestand und Lager."},"ru":{"title":"Товары и остатки","description":"Товары, варианты, остатки и склады."}}'::jsonb,20,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('help_orders','siparisler','{"tr":{"title":"Siparişler","description":"Sipariş, ödeme, iade ve gönderim işlemleri."},"en":{"title":"Orders","description":"Orders, payments, returns and fulfillment."},"de":{"title":"Bestellungen","description":"Bestellungen, Zahlungen, Retouren und Versand."},"ru":{"title":"Заказы","description":"Заказы, платежи, возвраты и доставка."}}'::jsonb,30,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('help_themes_apps','tema-moduller','{"tr":{"title":"Temalar ve modüller","description":"Tema ve uygulama ekosistemi."},"en":{"title":"Themes and apps","description":"Themes and app ecosystem."},"de":{"title":"Themes und Apps","description":"Themes und App-Ökosystem."},"ru":{"title":"Темы и приложения","description":"Экосистема тем и приложений."}}'::jsonb,40,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "HelpArticle" ("id","categoryId","slug","status","translations","keywords","sortOrder","createdAt","updatedAt") VALUES
('help_article_start','help_getting_started','magaza-kurulumuna-baslama','PUBLISHED','{"tr":{"title":"Mağaza kurulumuna başlama","summary":"Temel mağaza ayarlarını tamamlayın.","body":"Ayarlar Merkezi üzerinden mağaza bilgilerinizi, dil ve para birimini, ödeme, vergi, teslimat ve müşteri ayarlarını tamamlayın. Ardından ürünlerinizi ekleyip temanızı yayınlayabilirsiniz."},"en":{"title":"Start setting up your store","summary":"Complete the essential store settings.","body":"Use Settings Center to configure store details, language and currency, payments, taxes, delivery and customer settings. Then add products and publish your theme."},"de":{"title":"Shop-Einrichtung starten","summary":"Vervollständigen Sie die wichtigsten Shop-Einstellungen.","body":"Konfigurieren Sie im Einstellungscenter Shopdaten, Sprache, Währung, Zahlungen, Steuern, Lieferung und Kundeneinstellungen. Danach können Sie Produkte hinzufügen und Ihr Theme veröffentlichen."},"ru":{"title":"Начало настройки магазина","summary":"Заполните основные настройки магазина.","body":"В центре настроек укажите данные магазина, язык и валюту, оплату, налоги, доставку и параметры клиентов. Затем добавьте товары и опубликуйте тему."}}'::jsonb,ARRAY['setup','ayarlar','store'],10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('help_article_apps','help_themes_apps','modul-nasil-kurulur','PUBLISHED','{"tr":{"title":"Modül nasıl kurulur?","summary":"Modül Marketi veya Super Admin paket yükleme akışını kullanın.","body":"Mağaza sahibi yayınlanmış modülleri Modül Marketi üzerinden kurabilir. Ticarti sistem modülleri Super Admin tarafından imzalı/denetimli ZIP paketleri olarak yüklenir. Üçüncü taraf geliştiriciler uygulama paketlerini apiticarti.com Developer Portal üzerinden incelemeye gönderir."},"en":{"title":"How do I install an app?","summary":"Use the App Market or the controlled package workflow.","body":"Merchants can install published apps from the App Market. Ticarti system apps are uploaded by Super Admin as controlled ZIP packages. Third-party developers submit app packages for review through the apiticarti.com Developer Portal."},"de":{"title":"Wie installiere ich eine App?","summary":"Nutzen Sie den App-Markt oder den kontrollierten Paket-Workflow.","body":"Händler installieren veröffentlichte Apps über den App-Markt. Ticarti-System-Apps werden vom Super Admin als kontrollierte ZIP-Pakete hochgeladen. Drittanbieter reichen Apps über das Entwicklerportal apiticarti.com zur Prüfung ein."},"ru":{"title":"Как установить приложение?","summary":"Используйте магазин приложений или контролируемую загрузку пакета.","body":"Продавцы устанавливают опубликованные приложения из магазина приложений. Системные приложения Ticarti загружаются Super Admin как проверенные ZIP-пакеты. Сторонние разработчики отправляют приложения на проверку через портал apiticarti.com."}}'::jsonb,ARRAY['module','app','uygulama'],10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
