'use client';

import Link from 'next/link';
import { ApexOptions } from 'apexcharts';
import ApexCharts from 'react-apexcharts';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const money = (n: any, currency = 'TRY') =>
  new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

export function Orders({ data }: { data: any }) {
  const rows = Array.isArray(data?.chart) ? data.chart : [];
  const currency = data?.currency || 'TRY';
  const metric = data?.metrics?.orders || {};
  const netSales = data?.metrics?.netSales || {};
  const change = Number(metric.change || 0);

  const categories = rows.map((x: any) =>
    new Date(`${x.date}T00:00:00`).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
    }),
  );
  const series = rows.map((x: any) => Number(x.orders || 0));

  const options: ApexOptions = {
    series: [{ name: 'Sipariş', data: series }],
    chart: { height: 205, type: 'area', toolbar: { show: false } },
    dataLabels: { enabled: false },
    legend: { show: false },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: ['var(--color-primary)'],
    },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        rotate: 0,
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '11px',
          fontWeight: '400',
        },
      },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 5,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    fill: {
      type: 'gradient',
      gradient: { opacityFrom: 0.25, opacityTo: 0, stops: [0, 85, 100] },
    },
    tooltip: {
      y: { formatter: (value) => `${Math.round(value)} sipariş` },
    },
  };

  const ChangeIcon = change >= 0 ? ArrowUp : ArrowDown;

  return (
    <Card className="h-full">
      <CardHeader className="gap-2">
        <CardTitle>Siparişler</CardTitle>
        <Button mode="link" asChild>
          <Link href="/orders">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-semibold text-mono">
              {Number(metric.value || 0).toLocaleString('tr-TR')}
            </span>
            <span className="text-xs text-secondary-foreground">
              Seçili tarih aralığındaki siparişler
            </span>
          </div>

          <Badge
            appearance="light"
            variant={change >= 0 ? 'success' : 'destructive'}
            className="gap-0.5"
          >
            <ChangeIcon className="size-3" />
            %{Math.abs(change).toFixed(1)}
          </Badge>
        </div>

        <div className="flex items-center justify-between rounded-md bg-accent/50 px-3 py-2">
          <span className="text-xs text-secondary-foreground">Net ciro</span>
          <span className="text-sm font-semibold text-mono">
            {money(netSales.value, currency)}
          </span>
        </div>

        <div className="min-h-[205px]">
          {series.length ? (
            <ApexCharts
              options={options}
              series={options.series}
              type="area"
              height={205}
            />
          ) : (
            <div className="grid h-[205px] place-items-center text-sm text-muted-foreground">
              Seçili dönemde sipariş yok.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
