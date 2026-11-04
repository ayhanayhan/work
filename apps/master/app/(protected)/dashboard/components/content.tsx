'use client';

import dynamic from 'next/dynamic';
import { ChannelStats } from './channel-stats';
import { EntryCallout } from './entry-callout';
import { Highlights } from './highlights';
import { LowStockProducts } from './low-stock-products';
import { Teams } from './teams';
import { SetupTodo } from './setup-todo';

const EarningsChart = dynamic(
  () => import('./earnings-chart').then((m) => m.EarningsChart),
  { ssr: false },
);

export function TicartiDashboardContent({ data }: { data: any }) {
  return (
    <div className="grid gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-y-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1"><div className="grid grid-cols-2 gap-5 lg:gap-7.5 h-full items-stretch"><ChannelStats data={data} /></div></div>
        <div className="lg:col-span-2"><EntryCallout className="h-full" /></div>
      </div>
      <SetupTodo data={data} />
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1"><Highlights data={data} limit={4} /></div>
        <div className="lg:col-span-2"><EarningsChart data={data} /></div>
      </div>
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5 items-stretch">
        <div className="lg:col-span-1"><LowStockProducts data={data} /></div>
        <div className="lg:col-span-2"><Teams data={data} /></div>
      </div>
    </div>
  );
}
