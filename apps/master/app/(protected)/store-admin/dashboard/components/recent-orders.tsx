'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

const variant = (status: string) => {
  const s = String(status || '').toUpperCase();
  if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(s)) return 'destructive';
  if (['DELIVERED', 'COMPLETED', 'PAID'].includes(s)) return 'success';
  if (['PENDING', 'OPEN', 'PREPARING'].includes(s)) return 'warning';
  return 'secondary';
};

export function RecentOrders({ data }: { data: any }) {
  const rows = Array.isArray(data?.recentOrders) ? data.recentOrders : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Son Siparişler</CardTitle>
        <Button mode="link" asChild>
          <Link href="/orders">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
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
            {rows.map((row: any) => (
              <TableRow key={row.id}>
                <TableCell className="ps-5 font-medium">
                  <Link href={`/orders/${row.id}`} className="hover:text-primary">
                    #{row.number}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {new Date(row.createdAt).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell>
                  {[row.customer?.firstName, row.customer?.lastName]
                    .filter(Boolean)
                    .join(' ') ||
                    row.customer?.email ||
                    'Misafir'}
                </TableCell>
                <TableCell className="font-medium">
                  {money(row.grandTotal, row.currency || data?.currency)}
                </TableCell>
                <TableCell>
                  <Badge
                    appearance="light"
                    variant={variant(row.paymentStatus) as any}
                  >
                    {paymentStatusLabel(row)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge appearance="light" variant={variant(row.status) as any}>
                    {orderStatusLabel(row)}
                  </Badge>
                </TableCell>
                <TableCell className="pe-5 text-end">
                  <Button mode="link" asChild>
                    <Link href={`/orders/${row.id}`}>Detay</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {!rows.length && (
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
