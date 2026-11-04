'use client';
import Link from 'next/link';
import {SubscriptionBanner} from './subscription-banner';
import {AdminExtensionHost} from '@/components/extensions/AdminExtensionHost';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Settings,Globe,ShoppingCart,Truck,CreditCard,Globe2,Users,Bell,ShieldCheck,Code2,FileText,PackageSearch,Mail,MessageSquare,LockKeyhole,ChevronRight,Trash2,Building2} from 'lucide-react';

const groups=[
 {id:'store',title:'Mağaza',description:'Mağaza kimliği, bölgesel yapı ve görünürlük.',items:[['Genel','Mağaza bilgileri, logo, fatura bilgileri ve temel tercihler.','/settings/general',Settings],['Domain','Alan adınızı bağlayın, DNS ve Cloudflare ayarlarını yönetin.','/settings/domains',Globe],['Dil / Para Birimi','Dil, para birimi ve bölgesel ayarlar.','/settings/localization',Globe2],['Bakım Modu','Storefront bakım ekranı ve erişim istisnaları.','/settings/maintenance',ShieldCheck]]},
 {id:'sales',title:'Satış',description:'Siparişten stoğa kadar satış davranışları.',items:[['Sipariş & Checkout','Sipariş, checkout, iptal ve iade politikaları.','/settings/orders',ShoppingCart],['Ödeme','Kart entegrasyonları, havale ve kapıda ödeme.','/settings/payments',CreditCard],['Vergi','Ürün kullanım tipi ve ülke/bölge bazlı vergi kuralları.','/settings/tax',FileText],['Teslimat','Kargo, teslimat bölgeleri ve depo dağıtım politikaları.','/settings/delivery',Truck],['Ürün & Stok','Ürün ve stok varsayılanları.','/settings/products-stock',PackageSearch]]},
 {id:'customers',title:'Müşteri',description:'Müşteri hesabı, B2B, gizlilik ve yasal metinler.',items:[['Hesap & Gizlilik','Müşteri hesabı, checkout izinleri, KVKK ve veri tercihleri.','/settings/customers',Users],['B2B','Mevcut mağazayı B2B moda alın; fiyat, teklif, firma kaydı ve ödeme davranışını yönetin.','/settings/b2b',Building2],['Sözleşmeler','Yasal sözleşmeleri içerik sayfalarıyla eşleştirin.','/settings/contracts',FileText]]},
 {id:'communication',title:'İletişim',description:'Müşteriye giden tüm mesajları tek alanda yönetin.',items:[['E-posta Gönderici','Mağazanızın alan adını doğrulayın ve gönderici adresini seçin.','/settings/email-sender',Mail],['E-posta','Olay bazlı çok dilli e-posta şablonları.','/settings/email-templates',Mail],['SMS & WhatsApp','SMS ve WhatsApp durum mesajlarını aynı ekrandan yönetin.','/settings/message-templates',MessageSquare],['Bildirimler','Yönetici bildirimleri ve varsayılan kanallar.','/settings/notifications',Bell]]},
 {id:'team',title:'Ekip & Güvenlik',description:'Ekip erişimi, güvenlik ve anlaşılır işlem geçmişi.',items:[['Güvenlik','2FA ve güvenlik politikaları.','/settings/security',ShieldCheck],['Ekip Hareketleri','Kim hangi ürün, sipariş veya tasarımı değiştirdi?','/users/activity',LockKeyhole],['Roller / Yetkiler','Ekip rollerini ve izinleri yönetin.','/users/roles',Users]]},
 {id:'developer',title:'Geliştirici',description:'Dış sistemlerin mağazanıza güvenli erişimi.',items:[['API & Webhook','API anahtarları ve webhook endpointlerini tek ekranda yönetin.','/settings/api-keys',Code2]]},
] as const;


export default function Page(){
 return <>
  <Container>
   <Toolbar>
    <ToolbarHeading>
     <h1 className="text-xl font-semibold">Ayarlar Merkezi</h1>
     <ToolbarDescription>Mağazanızın ayarlarını kategorilere göre yönetin.</ToolbarDescription>
    </ToolbarHeading>
   </Toolbar>
  </Container>
  <Container className="grid gap-8 pb-10">
   <SubscriptionBanner/>
   {groups.map(group=>(
    <section key={group.id} aria-labelledby={`settings-${group.id}`} className="grid gap-4">
     <div className="grid gap-1">
      <h2 id={`settings-${group.id}`} className="text-lg font-semibold text-foreground">{group.title}</h2>
      <p className="text-sm text-muted-foreground">{group.description}</p>
     </div>
     <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {group.items.map(([title,description,path,Icon])=>(
       <Link key={path} href={path} className="group flex min-h-[158px] flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:p-7">
        <div className="flex items-center justify-between">
         <Icon aria-hidden="true" className="size-6 text-primary"/>
         <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"/>
        </div>
        <div className="grid gap-2">
         <h3 className="text-base font-medium leading-tight text-foreground group-hover:text-primary">{title}</h3>
         <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
       </Link>
      ))}
     </div>
    </section>
   ))}
   <AdminExtensionHost target="admin.settings.page"/>
   <section className="rounded-xl border border-destructive/20 bg-card">
    <div className="border-b px-5 py-4"><h2 className="font-semibold text-destructive">Tehlikeli İşlemler</h2></div>
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
     <p className="text-sm text-muted-foreground">Mağaza kapatma talebi, mağaza sahibi doğrulaması ve Super Admin incelemesi gerektirir. Veriler otomatik silinmez.</p>
     <Link href="/settings/delete-store" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2.5 text-sm font-medium text-white"><Trash2 className="size-4"/>Mağazayı Sil</Link>
    </div>
   </section>
  </Container>
 </>;
}
