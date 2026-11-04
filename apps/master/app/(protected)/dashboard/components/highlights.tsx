import { ShoppingBasket, RotateCcw, TrendingUp, Package, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Highlights({ data, limit }: { data: any; limit?: number }) {
  const m = data?.metrics || {};
  const number = (v: any) => Number(v || 0).toLocaleString('tr-TR');
  const money = (v: any) => new Intl.NumberFormat('tr-TR', {style:'currency',currency:data?.currency || 'TRY',maximumFractionDigits:2}).format(Number(v || 0));
  const revenue = m.revenue?.value ?? m.sales?.value;
  const orders = Number(m.orders?.value || 0);
  const rows = [
    {icon: TrendingUp, text:'Toplam ciro', value: revenue == null ? '—' : money(revenue)},
    {icon: ShoppingBasket, text:'Ortalama sipariş tutarı', value: revenue == null || !orders ? '—' : money(Number(revenue)/orders)},
    {icon: ClipboardList, text:'Toplam sipariş', value:number(orders)},
    {icon: RotateCcw, text:'İade sayısı', value:number(m.refunds?.count)},
    {icon: Package, text:'Kritik stok kalemi', value:number(Array.isArray(data?.lowStockItems) ? data.lowStockItems.length : 0)},
  ];
  return <Card className="h-full">
    <CardHeader className="min-h-14 py-3.5"><CardTitle>E-Ticaret Metrikleri</CardTitle></CardHeader>
    <CardContent className="px-5 py-3 lg:px-6 lg:py-4">
      <div className="grid gap-0.5">{rows.slice(0,limit ?? rows.length).map(row => {
        const Icon=row.icon;
        return <div key={row.text} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
          <div className="flex min-w-0 items-center gap-2.5"><div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Icon className="size-4 text-muted-foreground"/></div><span className="truncate text-sm text-foreground">{row.text}</span></div>
          <span className="shrink-0 text-sm font-semibold text-mono">{row.value}</span>
        </div>;
      })}</div>
    </CardContent>
  </Card>;
}
