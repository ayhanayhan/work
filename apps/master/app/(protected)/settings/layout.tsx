'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Building2, Languages, CircleDollarSign, LogIn, Settings } from 'lucide-react';
import { Container } from '@/components/common/container';

const items=[
  {href:'/settings',label:'Tüm Ayarlar',icon:Settings,exact:true},
  {href:'/settings/general',label:'Genel Ayarlar',icon:Building2},
  {href:'/settings/languages',label:'Diller',icon:Languages},
  {href:'/settings/currencies',label:'Para Birimleri',icon:CircleDollarSign},
  {href:'/settings/social-auth',label:'Sosyal Giriş',icon:LogIn},
];

export default function SettingsLayout({children}:{children:ReactNode}){
  const pathname=usePathname();
  return <Container>
    <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
      <aside className="h-fit rounded-xl border border-border bg-card p-2">
        <div className="px-3 pb-2 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Ayarlar</div>
        <nav className="space-y-1">
          {items.map(item=>{
            const active=item.exact?pathname===item.href:pathname.startsWith(item.href);
            const Icon=item.icon;
            return <Link key={item.href} href={item.href} className={`flex h-10 items-center gap-2 rounded-lg px-3 text-sm transition-colors ${active?'bg-muted font-medium text-primary':'text-foreground hover:bg-muted/60'}`}>
              <Icon className="size-4"/>
              <span>{item.label}</span>
            </Link>
          })}
        </nav>
      </aside>
      <section className="min-w-0">{children}</section>
    </div>
  </Container>;
}
