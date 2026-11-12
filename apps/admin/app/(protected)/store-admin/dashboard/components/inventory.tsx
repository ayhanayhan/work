'use client';

import Link from 'next/link';
import { Badge, BadgeDot } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Inventory({ data }: { data: any }) {
  const rows = Array.isArray(data?.lowStockItems)
    ? data.lowStockItems.slice(0, 3)
    : [];

  const items = [
    { badgeColor: 'success' as const, label: 'Stokta' },
    { badgeColor: 'warning' as const, label: 'Düşük stok' },
    { badgeColor: 'destructive' as const, label: 'Tükendi' },
  ];

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
            {Array.isArray(data?.lowStockItems) ? data.lowStockItems.length : 0}
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-3 mb-1">
          {items.map((item) => (
            <div key={item.label} className="flex items-center">
              <Badge appearance="ghost" variant={item.badgeColor}>
                <BadgeDot className="size-2" />
              </Badge>
              <span className="text-sm font-normal text-foreground">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-mono font-medium">Düşük stok</span>
            <Button mode="link" asChild>
              <Link href="/products/inventory">Tümünü Gör</Link>
            </Button>
          </div>

          {rows.map((row: any) => (
            <div
              key={row.variantId}
              className="flex items-center justify-between flex-wrap bg-accent/50 p-2.5 rounded-md gap-2"
            >
              <span className="text-sm text-mono">{row.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-mono">
                  Adet: {Number(row.available || 0)}
                </span>
                <span className="border-l border-input h-[12px]" />
                <Link
                  href="/products/inventory"
                  className="text-sm font-medium text-primary"
                >
                  Stok
                </Link>
              </div>
            </div>
          ))}

          {!rows.length && (
            <div className="grid min-h-28 place-items-center text-sm text-muted-foreground">
              Kritik stok bulunmuyor.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
