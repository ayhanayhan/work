'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  BadgePercent,
  Boxes,
  CircleDollarSign,
  FileText,
  Gift,
  Mail,
  MessageSquareText,
  Package,
  RotateCcw,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tags,
  Users,
  UsersRound,
  Warehouse,
  Workflow,
} from 'lucide-react';

type MenuLink = {
  title: string;
  description?: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const orders: MenuLink[] = [
  { title: 'Tüm Siparişler', description: 'Siparişleri görüntüle ve yönet', href: '/orders', icon: ShoppingBag },
  { title: 'Sipariş Oluştur', description: 'POS ekranından yeni sipariş oluştur', href: '/pos', icon: ShoppingCart },
  { title: 'İadeler & İptaller', description: 'İade ve iptal taleplerini yönet', href: '/orders/returns', icon: RotateCcw },
];

const products: MenuLink[] = [
  { title: 'Tüm Ürünler', href: '/products', icon: Package },
  { title: 'Kategoriler', href: '/products/categories', icon: Tags },
  { title: 'Markalar', href: '/products/brands', icon: BadgePercent },
  { title: 'Koleksiyonlar', href: '/products/collections', icon: Boxes },
  { title: 'Seçenekler & Varyantlar', href: '/products/options', icon: Workflow },
  { title: 'Stok Yönetimi', href: '/products/inventory', icon: Warehouse },
];

const customers: MenuLink[] = [
  { title: 'Müşteriler', description: 'Müşteri kartları ve geçmiş işlemler', href: '/customers', icon: Users },
  { title: 'Müşteri Grupları', description: 'Grup, fiyat ve indirim kuralları', href: '/customers/groups', icon: UsersRound },
];

const marketing: MenuLink[] = [
  { title: 'Genel Bakış', href: '/marketing', icon: Sparkles },
  { title: 'E-posta Pazarlama', href: '/marketing/email', icon: Mail },
  { title: 'SMS & WhatsApp', href: '/marketing/sms', icon: MessageSquareText },
  { title: 'Popup', href: '/marketing/popups', icon: FileText },
  { title: 'Otomasyonlar', href: '/marketing/automations', icon: Workflow },
  { title: 'Sadakat', href: '/marketing/loyalty', icon: Gift },
  { title: 'Affiliate', href: '/marketing/affiliate', icon: CircleDollarSign },
  { title: 'Kampanyalar', href: '/marketing/campaigns', icon: BadgePercent },
  { title: 'Promosyonlar', href: '/marketing/promotions', icon: Tags },
];

function DropdownGrid({ items, columns = 1 }: { items: MenuLink[]; columns?: 1 | 2 }) {
  return (
    <div className={cn('p-3 w-[340px]', columns === 2 && 'w-[560px] grid grid-cols-2 gap-x-2')}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavigationMenuLink asChild key={item.href}>
            <Link href={item.href} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors">
              {Icon && <Icon className="size-4 mt-0.5 text-muted-foreground shrink-0" />}
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{item.title}</span>
                {item.description && <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{item.description}</span>}
              </span>
            </Link>
          </NavigationMenuLink>
        );
      })}
    </div>
  );
}

export function TicartiMegaMenu() {
  const pathname = usePathname();

  const linkClass = `
    text-sm text-secondary-foreground font-medium
    hover:text-primary hover:bg-transparent
    focus:text-primary focus:bg-transparent
    data-[active=true]:text-primary data-[active=true]:bg-transparent
    data-[state=open]:text-primary data-[state=open]:bg-transparent
  `;

  const active = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-0">
        <NavigationMenuItem>
          <NavigationMenuLink asChild>
            <Link href="/dashboard" className={cn(linkClass)} data-active={pathname === '/dashboard' || undefined}>
              Dashboard
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(linkClass)} data-active={active('/orders') || undefined}>Siparişler</NavigationMenuTrigger>
          <NavigationMenuContent className="p-0"><DropdownGrid items={orders} /></NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(linkClass)} data-active={active('/products') || undefined}>Ürünler</NavigationMenuTrigger>
          <NavigationMenuContent className="p-0"><DropdownGrid items={products} columns={2} /></NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(linkClass)} data-active={active('/customers') || undefined}>Müşteriler</NavigationMenuTrigger>
          <NavigationMenuContent className="p-0"><DropdownGrid items={customers} /></NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={cn(linkClass)} data-active={active('/marketing') || undefined}>Pazarlama</NavigationMenuTrigger>
          <NavigationMenuContent className="p-0"><DropdownGrid items={marketing} columns={2} /></NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
