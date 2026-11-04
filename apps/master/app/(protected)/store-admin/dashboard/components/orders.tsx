'use client';

import Link from 'next/link';
import { ApexOptions } from 'apexcharts';
import ApexCharts from 'react-apexcharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Orders({ data }: { data: any }) {
  const rows = Array.isArray(data?.chart) ? data.chart : [];
  const categories = rows.map((x: any) =>
    new Date(`${x.date}T00:00:00`).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
    }),
  );
  const values = rows.map((x: any) => Number(x.orders || 0));

  const options: ApexOptions = {
    series: [{ name: 'Sipariş', data: values }],
    chart: { height: 200, type: 'area', toolbar: { show: false } },
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
          fontSize: '12px',
          fontWeight: '400',
        },
      },
    },
    yaxis: {
      min: 0,
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
    },
    markers: {
      size: 0,
      colors: 'var(--color-primary)',
      strokeColors: 'var(--color-primary)',
      strokeWidth: 4,
      hover: { size: 8, sizeOffset: 0 },
    },
    fill: { gradient: { opacityFrom: 0.25, opacityTo: 0 } },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 3,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      y: { formatter: (value) => `${Math.round(value)} sipariş` },
    },
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>Siparişler</CardTitle>
        <Button mode="link" asChild>
          <Link href="/orders">Tümünü Gör</Link>
        </Button>
      </CardHeader>

      <CardContent className="px-0 pt-5 lg:pt-7.5">
        <div className="px-5 lg:px-7.5 mb-5">
          <span className="text-3xl font-semibold text-mono">
            {Number(data?.metrics?.orders?.value || 0).toLocaleString('tr-TR')}
          </span>
          <div className="mt-1 text-sm text-secondary-foreground">
            Seçili dönemdeki siparişler
          </div>
        </div>

        {values.length ? (
          <ApexCharts
            options={options}
            series={options.series}
            type="area"
            height={200}
          />
        ) : (
          <div className="grid h-[200px] place-items-center text-sm text-muted-foreground">
            Seçili dönemde sipariş yok.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
