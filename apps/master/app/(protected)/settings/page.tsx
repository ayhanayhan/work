'use client';

import Link from 'next/link';
import { Building2, Languages, CircleDollarSign, LogIn, ArrowRight } from 'lucide-react';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const modules=[
  {href:'/settings/general',title:'Genel Ayarlar',description:'Firma bilgileri, iletişim ve marka görselleri.',icon:Building2},
  {href:'/settings/languages',title:'Diller',description:'Platform dillerini, varsayılan dili ve durumlarını yönetin.',icon:Languages},
  {href:'/settings/currencies',title:'Para Birimleri',description:'Kullanılabilir para birimleri ve varsayılan para birimini yönetin.',icon:CircleDollarSign},
  {href:'/settings/social-auth',title:'Sosyal Giriş',description:'Google ve Facebook giriş sağlayıcılarını yönetin.',icon:LogIn},
];

export default function SettingsPage(){
  return <Container>
    <div className="mb-6">
      <h1 className="text-2xl font-semibold">Ayarlar</h1>
      <p className="mt-1 text-sm text-muted-foreground">Platform ayarlarını ilgili bölümlerden yönetin.</p>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {modules.map(item=>{
        const Icon=item.icon;
        return <Link href={item.href} key={item.href} className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5"/>
                </div>
                <div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription className="mt-1">{item.description}</CardDescription>
                </div>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1"/>
            </CardHeader>
            <CardContent/>
          </Card>
        </Link>
      })}
    </div>
  </Container>;
}
