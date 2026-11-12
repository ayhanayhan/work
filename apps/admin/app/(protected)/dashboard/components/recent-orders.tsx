'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {orderStatusLabel,paymentStatusLabel} from '@/lib/commerce-labels';

const money = (n: any, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const statusVariant = (status: string) => {
  const value = String(status || '').toUpperCase();
  if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(value)) return 'destructive';
  if (['DELIVERED', 'COMPLETED', 'PAID'].includes(value)) return 'success';
  if (['PENDING', 'OPEN', 'PREPARING'].includes(value)) return 'warning';
  return 'secondary';
};

export function RecentOrders({ data }: { data: any }) {
  const [query, setQuery] = useState('');
  const rows = Array.isArray(data?.recentOrders) ? data.recentOrders : [];

  const filtered = useMemo(() => {
    const q = query.toLocaleLowerCase('tr');
    return rows.filter((row: any) =>
      `${row.number} ${row.customer?.firstName || ''} ${row.customer?.lastName || ''} ${row.customer?.email || ''}`
        .toLocaleLowerCase('tr')
        .includes(q),
    );
  }, [rows, query]);

  return (
    <Card>
      <CardHeader className="py-3.5">
        <CardTitle>Son Siparişler</CardTitle>
        <CardToolbar className="flex gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Sipariş ara..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-44 ps-9"
            />
          </div>

          <Button variant="outline" size="sm" asChild>
            <Link href="/orders">Tümünü Gör</Link>
          </Button>
        </CardToolbar>
      </CardHeader>

      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-5">Sipariş</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Ödeme</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="pe-5 text-end" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="ps-5 font-medium whitespace-nowrap">
                  <Link href={`/orders/${row.id}`} className="hover:text-primary">
                    #{row.number}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-secondary-foreground">
                  {new Date(row.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {[row.customer?.firstName, row.customer?.lastName]
                    .filter(Boolean)
                    .join(' ') ||
                    row.customer?.email ||
                    'Misafir'}
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {money(row.grandTotal, row.currency || data?.currency)}
                </TableCell>
                <TableCell>
                  <Badge
                    appearance="light"
                    variant={statusVariant(row.paymentStatus) as any}
                  >
                    {paymentStatusLabel(row)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    appearance="light"
                    variant={statusVariant(row.status) as any}
                  >
                    {orderStatusLabel(row)}
                  </Badge>
                </TableCell>
                <TableCell className="pe-5 text-end">
                  <Button mode="link" underlined="dashed" asChild>
                    <Link href={`/orders/${row.id}`}>Detay</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Sipariş bulunamadı.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
