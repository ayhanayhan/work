import { Fragment } from 'react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { Card, CardContent } from '@/components/ui/card';

interface IChannelStatsItem {
  info: string;
  desc: string;
  metric: string;
}
type IChannelStatsItems = Array<IChannelStatsItem>;

function Sparkline({ values }: { values: number[] }) {
  const width = 240;
  const height = 58;
  const valid = values.filter(Number.isFinite);
  if (valid.length < 2) {
    return <div className="h-[58px] w-full" aria-label="Grafik için yeterli dönemsel veri yok" />;
  }
  const low = Math.min(...valid);
  const high = Math.max(...valid);
  const range = high - low;
  const points = values.map((value, index) => {
    const x = 2 + (index * (width - 4)) / (values.length - 1);
    const y = range ? 50 - ((value - low) / range) * 42 : 29;
    return `${x},${y}`;
  }).join(' ');
  const fill = `2,${height} ${points} ${width - 2},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
      className="block h-[58px] w-full text-primary" aria-hidden="true">
      <polygon points={fill} fill="currentColor" opacity="0.07" />
      <polyline points={points} fill="none" stroke="currentColor"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const ChannelStats = ({ data }: { data: any }) => {
  const m = data?.metrics || {};
  const number = (v: any) => Number(v || 0).toLocaleString('tr-TR');
  const money = (v: any) => new Intl.NumberFormat('tr-TR', {
    style: 'currency', currency: data?.currency || 'TRY', maximumFractionDigits: 0,
  }).format(Number(v || 0));
  const items: IChannelStatsItems = [
    { metric: 'revenue', info: money(m.revenue?.value ?? m.sales?.value ?? 0), desc: 'Toplam satış' },
    { metric: 'orders', info: number(m.orders?.value), desc: 'Sipariş sayısı' },
    { metric: 'customers', info: m.customers?.value == null ? '—' : number(m.customers.value), desc: 'Müşteri sayısı' },
    { metric: 'pendingFulfillment', info: number(m.pendingFulfillment?.value), desc: 'Hazırlanacak sipariş' },
  ];
  const rows = Array.isArray(data?.chart) ? data.chart : [];
  const trends = data?.metricTrends || {};

  return (
    <Fragment>
      <style>{`
        .channel-stats-bg { background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3.png')}'); }
        .dark .channel-stats-bg { background-image: url('${toAbsoluteUrl('/media/images/2600x1600/bg-3-dark.png')}'); }
      `}</style>
      {items.map((item) => {
        const raw = Array.isArray(trends[item.metric])
          ? trends[item.metric]
          : rows.map((row: any) => item.metric === 'revenue'
            ? (row.revenue ?? row.sales)
            : row[item.metric]);
        const values = raw.map((value: any) => value == null ? NaN : Number(value));
        return (
          <Card key={item.metric}>
            <CardContent className="p-0 flex flex-col justify-between h-full bg-cover rtl:bg-[left_top_-1.7rem] bg-[right_top_-1.7rem] bg-no-repeat channel-stats-bg">
              <div className="w-full px-3 pt-4">
                <Sparkline values={values} />
              </div>
              <div className="flex flex-col gap-1 pb-4 px-5 pt-2">
                <span className="text-3xl font-semibold text-mono">{item.info}</span>
                <span className="text-sm font-normal text-muted-foreground">{item.desc}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </Fragment>
  );
};

export { ChannelStats, type IChannelStatsItem, type IChannelStatsItems };
