'use client';

import Link from 'next/link';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Inventory({ data }: { data: any }) {
  const lowStock = Array.isArray(data?.lowStockItems) ? data.lowStockItems : [];
  const pendingTransfers = Number(data?.metrics?.pendingTransfers?.value || 0);

  const rows = lowStock.slice(0, 3);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Stok</CardTitle>
        <Button mode="link" asChild>
          <Link href="/products/inventory">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-normal text-secondary-foreground">
            Kritik stok
          </span>
          <span className="text-3xl font-semibold text-mono">
            {lowStock.length}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <Badge appearance="ghost" variant="success">
              <BadgeDot className="size-2" />
            </Badge>
            <span className="text-sm font-normal text-foreground">
              Normal stok
            </span>
          </div>
          <div className="flex items-center">
            <Badge appearance="ghost" variant="warning">
              <BadgeDot className="size-2" />
            </Badge>
            <span className="text-sm font-normal text-foreground">Düşük</span>
          </div>
          <div className="flex items-center">
            <Badge appearance="ghost" variant="destructive">
              <BadgeDot className="size-2" />
            </Badge>
            <span className="text-sm font-normal text-foreground">Tükendi</span>
          </div>
        </div>

        <div className="grid gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-mono">
              Stoğu azalanlar
            </span>
            <span className="text-xs text-secondary-foreground">
              {pendingTransfers} transfer bekliyor
            </span>
          </div>

          {rows.map((row: any) => (
            <div
              key={row.variantId}
              className="flex items-center justify-between gap-2 rounded-md bg-accent/50 p-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-mono">{row.title}</div>
                <div className="truncate text-xs text-secondary-foreground">
                  {row.variantTitle || row.sku || 'Varyant'}
                </div>
              </div>
              <Badge
                appearance="light"
                variant={Number(row.available) <= 0 ? 'destructive' : 'warning'}
              >
                {Number(row.available || 0)} adet
              </Badge>
            </div>
          ))}

          {!rows.length && (
            <div className="grid min-h-28 place-items-center rounded-md bg-accent/30 text-sm text-muted-foreground">
              Kritik stok bulunmuyor.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
