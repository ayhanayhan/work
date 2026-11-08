import {
  Boxes,
  FileText,
  LayoutGrid,
  LifeBuoy,
  Palette,
  Plug,
  Settings,
  ShieldUser,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { type MenuConfig } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  { title: 'Kontrol Paneli', i18nKey: 'navigation.dashboard', icon: LayoutGrid, path: '/dashboard' },
  {
    title: 'Paketler', icon: Boxes, children: [
      { title: 'Tüm Paketler', path: '/products' },
      { title: 'Yeni Paket', path: '/products/new' },
      { title: 'Paket Özellikleri', path: '/products/features' },
      { title: 'Özellik Kategorileri', path: '/products/feature-categories' },
    ],
  },
  {
    title: 'Siparişler', i18nKey: 'navigation.orders', icon: ShoppingCart, children: [
      { title: 'Tüm Siparişler', i18nKey: 'navigation.all_orders', path: '/orders' },
      { title: 'Sipariş Oluştur', i18nKey: 'navigation.create_order', path: '/pos' },
      { title: 'Taslak Siparişler', path: '/orders/drafts' },
      { title: 'Terk Edilmiş Sepetler', path: '/orders/abandoned' },
      { title: 'POS / Hızlı Satış', path: '/pos' },
      { title: 'İadeler & İptaller', i18nKey: 'navigation.returns_cancellations', path: '/orders/returns' },
    ],
  },
  {
    title: 'Müşteriler', i18nKey: 'navigation.customers', icon: Users, children: [
      { title: 'Müşteriler', i18nKey: 'navigation.customers', path: '/customers' },
      { title: 'Müşteri Grupları', i18nKey: 'navigation.customer_groups', path: '/customers/groups' },
    ],
  },
  {
    title: 'İçerik', i18nKey: 'navigation.content', icon: FileText, children: [
      { title: 'Anasayfa', path: '/website/home' },
      { title: 'Sayfa İçerikleri', path: '/website/pages' },
      { title: 'Araçlar', path: '/website/tools' },
      { title: 'Sayfalar', i18nKey: 'navigation.pages', path: '/content/pages' },
      { title: 'Yorumlar', i18nKey: 'navigation.reviews', path: '/content/reviews' },
      { title: 'Sorular', i18nKey: 'navigation.questions', path: '/content/questions' },
    ],
  },
  {
    title: 'Blog', i18nKey: 'navigation.blog', icon: FileText, children: [
      { title: 'Blog İçerikleri', i18nKey: 'navigation.blog_posts', path: '/website/blog' },
      { title: 'Blog Kategorileri', i18nKey: 'navigation.blog_categories', path: '/website/blog/categories' },
      { title: 'Blog Yazarları', path: '/website/blog/authors' },
    ],
  },
  {
    title: 'Pazarlama', i18nKey: 'navigation.marketing', icon: TrendingUp, children: [
      { title: 'Genel Bakış', i18nKey: 'navigation.overview', path: '/marketing' },
      { title: 'E-posta Pazarlama', i18nKey: 'navigation.email_marketing', path: '/marketing/email' },
      { title: 'SMS & WhatsApp', i18nKey: 'navigation.sms_marketing', path: '/marketing/sms' },
      { title: 'Popup', i18nKey: 'navigation.popups', path: '/marketing/popups' },
      { title: 'Otomasyonlar', i18nKey: 'navigation.automations', path: '/marketing/automations' },
      { title: 'Sadakat', i18nKey: 'navigation.loyalty', path: '/marketing/loyalty' },
      { title: 'Affiliate', i18nKey: 'navigation.affiliate', path: '/marketing/affiliate' },
      { title: 'Kampanyalar', i18nKey: 'navigation.campaigns', path: '/marketing/campaigns' },
      { title: 'Promosyonlar', i18nKey: 'navigation.promotions', path: '/marketing/promotions' },
      { title: 'Hediye Kartları', path: '/marketing/gift-cards' },
    ],
  },
  {
    title: 'Kullanıcılar', i18nKey: 'navigation.users', icon: ShieldUser, children: [
      { title: 'Kullanıcılar', i18nKey: 'navigation.users', path: '/users' },
      { title: 'Roller & Yetkiler', i18nKey: 'navigation.roles_permissions', path: '/users/roles' },
      { title: 'Log Kayıtları', i18nKey: 'navigation.activity_logs', path: '/users/activity' },
    ],
  },
  { title: 'Temalar', icon: Palette, children: [
    { title: 'Tema Kataloğu', path: '/themes' },
    { title: 'Tema Düzenleme', path: '/themes/manage' },
    { title: 'Tema Kurulumları', path: '/themes/installations' },
  ] },
  { title: 'Raporlar', i18nKey: 'navigation.reports', icon: TrendingUp, path: '/reports' },
  { title: 'SEO', i18nKey: 'navigation.seo', icon: FileText, path: '/seo' },
  { title: 'Destek', i18nKey: 'navigation.support', icon: LifeBuoy, path: '/support' },
  { title: 'İletişim', icon: FileText, children: [
    { title: 'İletişim Mesajları', path: '/contact' },
    { title: 'Telefon Talepleri', path: '/contact/callbacks' },
  ] },
  {
    title: 'Uygulamalar', icon: Plug, children: [
      { title: 'Uygulama Kataloğu', path: '/extensions/market' },
      { title: 'Mağaza Kurulumları', path: '/extensions/installed' },
    ],
  },
  { title: 'Ayarlar', i18nKey: 'navigation.settings', icon: Settings, path: '/settings' }];

// Eski Ticarti demo menüleri final pakette devre dışı bırakıldı.
export const MENU_SIDEBAR_CUSTOM: MenuConfig = [];
export const MENU_SIDEBAR_COMPACT: MenuConfig = [];
export const MENU_ROOT: MenuConfig = MENU_SIDEBAR;
export const MENU_MEGA: MenuConfig = MENU_SIDEBAR;
export const MENU_MEGA_MOBILE: MenuConfig = MENU_SIDEBAR;
export const MENU_HELP: MenuConfig = [];
