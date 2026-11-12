'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  FileText,
  PackageCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityItem {
  totalColor: string;
  total: number;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export function SalesActivity({ data }: { data: any }) {
  const metrics = data?.metrics || {};

  const items: ActivityItem[] = [
    {
      totalColor: 'text-primary',
      total: Number(metrics.orders?.value || 0),
      label: 'Sipariş',
      description: 'seçili dönemde',
      icon: CheckCircle,
      href: '/orders',
    },
    {
      totalColor: 'text-destructive',
      total: Number(metrics.pendingFulfillment?.value || 0),
      label: 'Paket',
      description: 'hazırlama bekliyor',
      icon: Truck,
      href: '/orders',
    },
    {
      totalColor: 'text-green-500',
      total: Number(metrics.pendingTransfers?.value || 0),
      label: 'Transfer',
      description: 'depo hareketi',
      icon: PackageCheck,
      href: '/products/inventory',
    },
    {
      totalColor: 'text-yellow-500',
      total: Number(metrics.refunds?.count || 0),
      label: 'İade',
      description: 'seçili dönemde',
      icon: FileText,
      href: '/orders/returns',
    },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="bg-accent/50">
        <CardTitle>Satış Aktivitesi</CardTitle>
        <Button mode="link" asChild>
          <Link href="/orders">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent className="flex gap-2 lg:pb-7">
        {items.map((item, index) => (
          <Fragment key={item.description}>
            <Link
              href={item.href}
              className="grid flex-1 place-content-center gap-1 text-center hover:opacity-80"
            >
              <div className="flex flex-col gap-1">
                <span className={`text-4xl font-medium ${item.totalColor}`}>
                  {item.total.toLocaleString('tr-TR')}
                </span>
                <span className="text-xs font-normal text-secondary-foreground">
                  {item.label}
                </span>

                <div className="mt-4 flex items-start justify-center gap-1">
                  <item.icon size={16} className="text-muted-foreground" />
                  <span className="text-xs font-medium uppercase text-secondary-foreground">
                    {item.description}
                  </span>
                </div>
              </div>
            </Link>

            {index < items.length - 1 && (
              <span className="my-1 border-e border-e-input" />
            )}
          </Fragment>
        ))}
      </CardContent>
    </Card>
  );
}
