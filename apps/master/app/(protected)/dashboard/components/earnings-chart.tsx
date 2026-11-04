import { useEffect, useState } from 'react';
import { ApexOptions } from 'apexcharts';
import ApexChart from 'react-apexcharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

// Hardcoded dummy data for the earnings chart


const EarningsChart = ({ data }: { data: any }) => {
  const rows = Array.isArray(data?.chart) ? data.chart : [];
  const chartData = rows.map((row: any) => Number(row.revenue ?? row.sales ?? 0));
  const categories = rows.map((row:any)=>String(row.date || ''));
  const options: ApexOptions = {
    series: [
      {
        name: 'Satış',
        data: chartData ?? [],
      },
    ],
    chart: {
      height: 250,
      type: 'area',
      toolbar: {
        show: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    stroke: {
      curve: 'smooth',
      show: true,
      width: 3,
      colors: ['var(--color-primary)'],
    },
    xaxis: {
      categories: categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
      },
      crosshairs: {
        position: 'front',
        stroke: {
          color: 'var(--color-primary)',
          width: 1,
          dashArray: 3,
        },
      },
      tooltip: {
        enabled: false,
        formatter: undefined,
        offsetY: 0,
        style: {
          fontSize: '12px',
        },
      },
    },
    yaxis: {
      min: 0,

      tickAmount: 5,
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: 'var(--color-secondary-foreground)',
          fontSize: '12px',
        },
        formatter: (defaultValue) => {
          return Number(defaultValue).toLocaleString('tr-TR');
        },
      },
    },
    tooltip: { y: { formatter: (value: number) => new Intl.NumberFormat('tr-TR', {style:'currency',currency:data?.currency || 'TRY'}).format(value) } },
    markers: {
      size: 0,
      colors: 'var(--color-white)',
      strokeColors: 'var(--color-primary)',
      strokeWidth: 4,
      strokeOpacity: 1,
      strokeDashArray: 0,
      fillOpacity: 1,
      discrete: [],
      shape: 'circle',
      offsetX: 0,
      offsetY: 0,
      onClick: undefined,
      onDblClick: undefined,
      showNullDataPoints: true,
      hover: {
        size: 8,
        sizeOffset: 0,
      },
    },
    fill: {
      gradient: {
        opacityFrom: 0.25,
        opacityTo: 0,
      },
    },
    grid: {
      borderColor: 'var(--color-border)',
      strokeDashArray: 5,
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
    },
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Satışlar</CardTitle>
        <div className="flex gap-5">
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-update" className="text-sm">
              Siparişler
            </Label>
            <Switch id="auto-update" defaultChecked size="sm" />
          </div>
          <Select defaultValue="1">
            <SelectTrigger className="w-28">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent className="w-28">
              <SelectItem value="1">1 ay</SelectItem>
              <SelectItem value="3">3 ay</SelectItem>
              <SelectItem value="6">6 ay</SelectItem>
              <SelectItem value="12">12 ay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-end items-stretch grow px-3 py-1">
        <ApexChart
          id="earnings_chart"
          options={options}
          series={options.series}
          type="area"
          max-width="694"
          height="250"
        />
      </CardContent>
    </Card>
  );
};

export { EarningsChart };
