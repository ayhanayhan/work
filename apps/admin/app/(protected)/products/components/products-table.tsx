'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search, Filter, Settings2, EllipsisVertical, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader, CardHeading, CardTable, CardToolbar } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const PRODUCTS = [
  { id:'1', image:'/media/products/19.jpg', name:'Oversize Basic T-Shirt', sku:'TSH-001-BLK-M', category:'Tişört', price:'₺799,90', stock:124, status:'Aktif', channels:'3 kanal' },
  { id:'2', image:'/media/products/4.jpg', name:'Premium Hoodie', sku:'HOD-014-GRY-L', category:'Sweatshirt', price:'₺1.499,90', stock:42, status:'Aktif', channels:'4 kanal' },
  { id:'3', image:'/media/products/32.jpg', name:'Slim Fit Chino Pantolon', sku:'CHN-032-NVY-32', category:'Pantolon', price:'₺1.249,90', stock:18, status:'Aktif', channels:'2 kanal' },
  { id:'4', image:'/media/products/7.jpg', name:'Deri Omuz Çantası', sku:'BAG-007-BRN', category:'Çanta', price:'₺2.299,90', stock:8, status:'Düşük stok', channels:'3 kanal' },
  { id:'5', image:'/media/products/1.jpg', name:'Minimal Sneaker', sku:'SNK-021-WHT-42', category:'Ayakkabı', price:'₺2.749,90', stock:0, status:'Tükendi', channels:'4 kanal' },
  { id:'6', image:'/media/products/14.jpg', name:'Keten Gömlek', sku:'SHT-018-BGE-M', category:'Gömlek', price:'₺1.099,90', stock:67, status:'Taslak', channels:'Online Mağaza' },
];

export function ProductsTable(){
  const [q,setQ]=useState('');
  const rows=useMemo(()=>PRODUCTS.filter(p=>`${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase())),[q]);
  return <Card>
    <CardHeader>
      <CardHeading>
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="size-4 text-muted-foreground absolute start-3 top-1/2 -translate-y-1/2" />
            <Input placeholder="Ürün ara..." value={q} onChange={e=>setQ(e.target.value)} className="ps-9 w-64" />
            {q && <Button mode="icon" variant="ghost" className="absolute end-1.5 top-1/2 -translate-y-1/2 h-6 w-6" onClick={()=>setQ('')}><X /></Button>}
          </div>
          <Button variant="outline"><Filter />Durum</Button>
          <Button variant="outline"><Filter />Kategori</Button>
          <Button variant="outline"><Filter />Satış Kanalı</Button>
        </div>
      </CardHeading>
      <CardToolbar><Button variant="outline"><Settings2 />Kolonlar</Button></CardToolbar>
    </CardHeader>
    <CardTable>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-[42%]">Ürün</TableHead><TableHead>SKU</TableHead><TableHead>Kategori</TableHead><TableHead>Fiyat</TableHead><TableHead>Stok</TableHead><TableHead>Durum</TableHead><TableHead>Kanallar</TableHead><TableHead className="w-12"></TableHead>
        </TableRow></TableHeader>
        <TableBody>{rows.map(p=><TableRow key={p.id}>
          <TableCell><div className="flex items-center gap-3"><img src={p.image} alt="" className="size-12 rounded-md object-cover border"/><div><Link href={`/products/${p.id}`} className="font-medium text-foreground hover:text-primary">{p.name}</Link><div className="text-xs text-muted-foreground mt-1">Son güncelleme bugün</div></div></div></TableCell>
          <TableCell className="font-mono text-xs">{p.sku}</TableCell><TableCell>{p.category}</TableCell><TableCell className="font-medium">{p.price}</TableCell>
          <TableCell><span className={p.stock===0?'text-destructive':p.stock<10?'text-warning':'text-foreground'}>{p.stock}</span></TableCell>
          <TableCell><Badge variant={p.status==='Aktif'?'success':p.status==='Taslak'?'secondary':p.status==='Tükendi'?'destructive':'warning'} appearance="light">{p.status}</Badge></TableCell>
          <TableCell>{p.channels}</TableCell>
          <TableCell><Button mode="icon" variant="ghost" asChild><Link href={`/products?edit=${p.id}`} scroll={false}><EllipsisVertical /></Link></Button></TableCell>
        </TableRow>)}</TableBody>
      </Table>
    </CardTable>
    <CardFooter><div className="flex items-center justify-between w-full text-sm text-muted-foreground"><span>{rows.length} ürün gösteriliyor</span><span>Toplam 248 ürün</span></div></CardFooter>
  </Card>;
}
