'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Bestsellers({ data }: { data: any }) {
  const items = Array.isArray(data?.topProducts)
    ? data.topProducts.slice(0, 4)
    : [];

  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <CardTitle>En Çok Satanlar</CardTitle>
        <Button mode="link" asChild>
          <Link href="/products">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-5 lg:gap-7.5">
          {items.map((item: any, index: number) => (
            <div
              key={`${item.productId || item.title}-${index}`}
              className="flex items-center grow gap-2.5"
            >
              <div className="flex h-[50px] w-[60px] shrink-0 items-center justify-center rounded-md border border-border bg-accent/50">
                <Package className="size-5 text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1 grow">
                <Link
                  href={item.productId ? `/products/${item.productId}` : '/products'}
                  className="text-sm font-medium text-mono hover:text-primary"
                >
                  {item.title || 'Ürün'}
                </Link>
                <div className="flex items-center justify-between gap-3 text-xs text-secondary-foreground">
                  <span>SKU: {item.sku || '-'}</span>
                  <span className="font-medium text-foreground">
                    {Number(item.quantity || 0)} adet
                  </span>
                </div>
              </div>
            </div>
          ))}

          {!items.length && (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              Seçili dönemde satış verisi yok.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
