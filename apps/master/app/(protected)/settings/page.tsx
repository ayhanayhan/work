'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

type Item={href:string;icon:string;title:string;description:string;active?:boolean};
type Group={title:string;subtitle:string;items:Item[]};

const groups:Group[]=[
  {
    title:'Mağaza',
    subtitle:'Mağaza kimliği, bölgesel yapı ve görünürlük.',
    items:[
      {href:'/settings/general',icon:'iconoir:settings',title:'Genel',description:'Mağaza bilgileri, logo, fatura bilgileri ve temel tercihler.',active:true},
      {href:'/settings/domains',icon:'iconoir:globe',title:'Domain',description:'Alan adınızı bağlayın, DNS ve Cloudflare ayarlarını yönetin.'},
      {href:'/settings/localization',icon:'iconoir:language',title:'Dil / Para Birimi',description:'Dil, para birimi ve bölgesel ayarlar.'},
      {href:'/settings/maintenance',icon:'iconoir:shield-check',title:'Bakım Modu',description:'Storefront bakım ekranı ve erişim istisnaları.'},
    ],
  },
  {
    title:'Satış',
    subtitle:'Siparişten stoğa kadar satış davranışları.',
    items:[
      {href:'/settings/orders',icon:'iconoir:cart',title:'Sipariş & Checkout',description:'Sipariş, checkout, iptal ve iade politikaları.'},
      {href:'/settings/payments',icon:'iconoir:credit-card',title:'Ödeme',description:'Kart entegrasyonları, havale ve kapıda ödeme.'},
      {href:'/settings/tax',icon:'iconoir:page',title:'Vergi',description:'Ürün kullanım tipi ve ülke/bölge bazlı vergi kuralları.'},
      {href:'/settings/delivery',icon:'iconoir:delivery-truck',title:'Teslimat',description:'Kargo, teslimat bölgeleri ve depo dağıtım politikaları.'},
      {href:'/settings/products-stock',icon:'iconoir:box-iso',title:'Ürün & Stok',description:'Ürün ve stok varsayılanları.'},
    ],
  },
  {
    title:'Müşteri',
    subtitle:'Müşteri hesabı, B2B, gizlilik ve yasal metinler.',
    items:[
      {href:'/settings/customers',icon:'iconoir:user',title:'Hesap & Gizlilik',description:'Müşteri hesabı, checkout izinleri, KVKK ve veri tercihleri.'},
      {href:'/settings/b2b',icon:'iconoir:building',title:'B2B',description:'Mevcut mağazayı B2B moda alın; fiyat, teklif, firma kaydı ve ödeme davranışını yönetin.'},
      {href:'/settings/contracts',icon:'iconoir:page-edit',title:'Sözleşmeler',description:'Yasal sözleşmeleri içerik sayfalarıyla eşleştirin.'},
    ],
  },
  {
    title:'İletişim',
    subtitle:'Müşteriye giden tüm mesajları tek alanda yönetin.',
    items:[
      {href:'/settings/email-sender',icon:'iconoir:mail',title:'E-posta Gönderici',description:'Mağazanızın alan adını doğrulayın ve gönderici adresini seçin.'},
      {href:'/settings/email-templates',icon:'iconoir:mail',title:'E-posta',description:'Olay bazlı çok dilli e-posta şablonları.'},
      {href:'/settings/message-templates',icon:'iconoir:message-text',title:'SMS & WhatsApp',description:'SMS ve WhatsApp durum mesajlarını aynı ekrandan yönetin.'},
      {href:'/settings/notifications',icon:'iconoir:bell-notification',title:'Bildirimler',description:'Yönetici bildirimleri ve varsayılan kanallar.'},
    ],
  },
  {
    title:'Ekip & Güvenlik',
    subtitle:'Ekip erişimi, güvenlik ve anlaşılır işlem geçmişi.',
    items:[
      {href:'/settings/security',icon:'iconoir:shield-check',title:'Güvenlik',description:'2FA ve güvenlik politikaları.'},
      {href:'/users/activity',icon:'iconoir:activity',title:'Ekip Hareketleri',description:'Kim hangi ürün, sipariş veya tasarımı değiştirdi?'},
      {href:'/users/roles',icon:'iconoir:key',title:'Roller / Yetkiler',description:'Ekip rollerini ve izinleri yönetin.'},
    ],
  },
  {
    title:'Geliştirici',
    subtitle:'Dış sistemlerin mağazanıza güvenli erişimi.',
    items:[
      {href:'/settings/api-keys',icon:'iconoir:code',title:'API & Webhook',description:'API anahtarları ve webhook endpointlerini tek ekranda yönetin.'},
    ],
  },
];

export default function SettingsPage(){
  return <div className="admin-settings-home">
    <div className="admin-settings-head">
      <h1>Ayarlar Merkezi</h1>
      <p>Mağazanızın ayarlarını kategorilere göre yönetin.</p>
    </div>

    <section className="settings-subscription-card">
      <div className="settings-subscription-copy">
        <span className="settings-subscription-icon"><Icon icon="iconoir:wallet"/></span>
        <div>
          <small>Mağaza aboneliğiniz</small>
          <strong>Grow</strong>
          <p>Planınızı, abonelik sürenizi ve yükseltme seçeneklerini yönetin.</p>
        </div>
      </div>
      <div className="settings-subscription-meta">
        <span className="settings-status">Aktif</span>
        <b>19 Ekim 2026 · 0 gün kaldı</b>
      </div>
      <div className="settings-subscription-actions">
        <Link href="/plans" className="settings-plan-button">Planları görüntüle</Link>
        <Link href="/memberships">Abonelik ve fatura ayrıntıları →</Link>
      </div>
    </section>

    {groups.map(group=><section className="admin-settings-group" key={group.title}>
      <div className="admin-settings-group-head">
        <h2>{group.title}</h2>
        <p>{group.subtitle}</p>
      </div>

      <div className="admin-settings-grid">
        {group.items.map(item=><Link href={item.href} key={item.href} className={'admin-settings-card'+(item.active?' is-active':'')}>
          <span className="admin-settings-icon"><Icon icon={item.icon}/></span>
          <div className="admin-settings-card-copy">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
          {item.active&&<Icon icon="iconoir:nav-arrow-right" className="admin-settings-arrow"/>}
        </Link>)}
      </div>
    </section>)}

    <section className="admin-settings-danger">
      <div>
        <h2>Tehlikeli İşlemler</h2>
        <p>Mağaza kapatma talebi, mağaza sahibi doğrulaması ve Super Admin incelemesi gerektirir. Veriler otomatik silinmez.</p>
      </div>
      <Link href="/settings/delete-store" className="admin-settings-delete"><Icon icon="iconoir:trash"/>Mağazayı Sil</Link>
    </section>
  </div>;
}
