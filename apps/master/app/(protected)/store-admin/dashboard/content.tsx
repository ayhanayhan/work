'use client';

import dynamic from 'next/dynamic';
import { Bestsellers } from '@/app/(protected)/store-admin/dashboard/components/bestsellers';
import { Inventory } from '@/app/(protected)/store-admin/dashboard/components/inventory';
import { InventorySummary } from '@/app/(protected)/store-admin/dashboard/components/inventory-summary';
import { RecentOrders } from '@/app/(protected)/store-admin/dashboard/components/recent-orders';
import { SalesActivity } from '@/app/(protected)/store-admin/dashboard/components/sales-activity';

const Orders = dynamic(
  () =>
    import('@/app/(protected)/store-admin/dashboard/components/orders').then(
      (m) => m.Orders,
    ),
  { ssr: false },
);

export function DashboardContent({ data }: { data: any }) {
  return (
    <div className="flex flex-col gap-5 lg:gap-7.5">
      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5">
        <Orders data={data} />
        <Inventory data={data} />
        <Bestsellers data={data} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 lg:gap-7.5">
        <div className="lg:col-span-2">
          <SalesActivity data={data} />
        </div>

        <div className="lg:col-span-1">
          <InventorySummary data={data} />
        </div>
      </div>

      <div className="grid lg:grid-cols-1">
        <div className="lg:col-span-1">
          <RecentOrders data={data} />
        </div>
      </div>
    </div>
  );
}
