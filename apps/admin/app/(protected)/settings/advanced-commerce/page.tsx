'use client';
import Link from 'next/link';
import {ArrowRight,Boxes,Gift,ShoppingCart,Users,Warehouse,Globe2,ShieldCheck} from 'lucide-react';
import {Container} from '@/components/common/container';
import {Toolbar,ToolbarDescription,ToolbarHeading} from '@/partials/common/toolbar';
import {Card,CardContent,CardHeader,CardHeading} from '@/components/ui/card';
import {Button} from '@/components/ui/button';

const items=[
  {title:'Taslak Siparişler',description:'Teklif, telefon ve satış temsilcisi siparişlerini yönetin.',href:'/orders/drafts',icon:ShoppingCart},
  {title:'Terk Edilen Checkout',description:'Terk edilen sepetleri ve recovery akışlarını yönetin.',href:'/orders/abandoned',icon:ShoppingCart},
  {title:'Hediye Kartları',description:'Hediye kartı oluşturma ve kullanım kayıtları.',href:'/marketing/gift-cards',icon:Gift},
  {title:'Mağaza Bakiyesi',description:'Müşteri mağaza bakiyesi ve hareketleri.',href:'/customers/store-credit',icon:Users},
  {title:'B2B',description:'Firma hesapları, teklifler, fiyat görünürlüğü ve ödeme vadeleri.',href:'/settings/b2b',icon:Users},
  {title:'Satış Kanalları',description:'Online mağaza, POS ve harici satış kanallarını yönetin.',href:'/settings/sales-channels',icon:Boxes},
  {title:'Kargo & Depolar',description:'Teslimat, kargo profilleri ve depo dağıtım politikaları.',href:'/settings/delivery',icon:Warehouse},
  {title:'Dil, Para Birimi & Bölge',description:'Market, dil, para birimi ve bölgesel davranışlar.',href:'/settings/localization',icon:Globe2},
  {title:'Sipariş Riski',description:'Risk seviyelerini sipariş operasyon ekranından takip edin.',href:'/orders',icon:ShieldCheck},
];

export default function AdvancedCommercePage(){
  return <><Container><Toolbar><ToolbarHeading><h1 className="text-xl font-semibold">Ticaret Araçları</h1><ToolbarDescription>İleri ticaret özellikleri kendi operasyon ekranlarında yönetilir. Ham ID/JSON yönetimi kaldırıldı.</ToolbarDescription></ToolbarHeading></Toolbar></Container><Container><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map(({title,description,href,icon:Icon})=><Card key={href}><CardHeader><CardHeading className="flex items-center gap-2"><Icon className="size-4"/>{title}</CardHeading></CardHeader><CardContent className="grid gap-4"><p className="text-sm text-muted-foreground">{description}</p><Button variant="outline" asChild><Link href={href}>Yönet <ArrowRight/></Link></Button></CardContent></Card>)}</div></Container></>
}
