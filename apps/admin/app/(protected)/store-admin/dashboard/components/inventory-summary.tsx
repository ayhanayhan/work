'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function InventorySummary({ data }: { data: any }) {
  const warehouses = Array.isArray(data?.warehouses) ? data.warehouses : [];
  const lowStock = Array.isArray(data?.lowStockItems) ? data.lowStockItems : [];

  return (
    <Card className="h-full">
      <CardHeader className="bg-accent/50 px-3">
        <CardTitle>Stok Özeti</CardTitle>
      </CardHeader>

      <CardContent className="space-y-2.5 px-4">
        <div className="flex items-center justify-between gap-5">
          <span className="text-sm font-normal uppercase text-secondary-foreground">
            Aktif depo
          </span>
          <span className="text-2xl font-medium text-mono">
            {warehouses.length}
          </span>
        </div>

        <div className="mt-1 border-b border-b-border" />

        <div className="flex items-center justify-between gap-5 text-sm">
          <span className="font-normal uppercase text-secondary-foreground">
            Kritik stok
          </span>
          <span className="text-2xl font-medium text-mono">
            {lowStock.length}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
