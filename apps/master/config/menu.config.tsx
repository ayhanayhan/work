import { Activity, AppWindow, Boxes, CircleDollarSign, FileText, Globe2, LayoutDashboard, LifeBuoy, Package, Palette, Settings, ShieldUser, Store, Users } from 'lucide-react';
import { type MenuConfig } from './types';

export const MENU_SIDEBAR: MenuConfig = [
  { title: 'Genel Bakış', icon: LayoutDashboard, path: '/dashboard' },
  { title: 'Mağazalar', icon: Store, path: '/tenants' },
  { title: 'Üyelikler', icon: Users, path: '/memberships' },
  { title: 'Paketler', icon: Package, path: '/plans' },
  {
    title: 'İçerik', icon: FileText, children: [
      { title: 'Ana Sayfa', path: '/content/home' },
      { title: 'Login', path: '/content/login' },
      { title: 'Register', path: '/content/register' },
      { title: 'Blog', path: '/content/blog' },
      { title: 'Sayfalar', path: '/content/pages' },
    ],
  },
  { title: 'Uygulamalar', icon: AppWindow, path: '/apps' },
  { title: 'Temalar', icon: Palette, path: '/themes' },
  { title: 'Alan Adları', icon: Globe2, path: '/domains' },
  { title: 'Döviz', icon: CircleDollarSign, path: '/currency' },
  { title: 'Canlı Denetim', icon: Activity, path: '/live' },
  { title: 'Altyapı', icon: Boxes, path: '/infrastructure' },
  { title: 'Ekip & Yetkiler', icon: ShieldUser, path: '/users' },
  { title: 'Destek', icon: LifeBuoy, path: '/support' },
  { title: 'Ayarlar', icon: Settings, path: '/settings' },
];
export const MENU_SIDEBAR_CUSTOM: MenuConfig=[];
export const MENU_SIDEBAR_COMPACT: MenuConfig=[];
export const MENU_ROOT: MenuConfig=MENU_SIDEBAR;
export const MENU_MEGA: MenuConfig=MENU_SIDEBAR;
export const MENU_MEGA_MOBILE: MenuConfig=MENU_SIDEBAR;
export const MENU_HELP: MenuConfig=[];
