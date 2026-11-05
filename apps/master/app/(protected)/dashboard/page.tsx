'use client';

import { Container } from '@/components/common/container';
import { TicartiDashboardContent } from './components/content';

const mockData = {
  currency: 'TRY',
  metrics: {
    revenue: { value: 2847600 },
    sales: { value: 2847600 },
    orders: { value: 1284 },
    customers: { value: 946 },
    pendingFulfillment: { value: 37 },
    refunds: { count: 18 },
  },
  metricTrends: {
    revenue: [124000, 138000, 151000, 147000, 168000, 176000, 181000, 194000, 205000, 219000, 228000, 241000],
    orders: [72, 81, 88, 84, 96, 103, 109, 117, 121, 129, 136, 148],
    customers: [41, 48, 54, 59, 63, 69, 74, 81, 86, 91, 97, 104],
    pendingFulfillment: [24, 29, 22, 31, 28, 35, 33, 39, 34, 41, 38, 37],
  },
  chart: [
    { date: '1 Eki', revenue: 62000 },
    { date: '4 Eki', revenue: 84000 },
    { date: '7 Eki', revenue: 76000 },
    { date: '10 Eki', revenue: 98000 },
    { date: '13 Eki', revenue: 112000 },
    { date: '16 Eki', revenue: 104000 },
    { date: '19 Eki', revenue: 126000 },
    { date: '22 Eki', revenue: 119000 },
    { date: '25 Eki', revenue: 141000 },
    { date: '28 Eki', revenue: 154000 },
    { date: '31 Eki', revenue: 166000 },
  ],
  todo: [],
  lowStockItems: [
    { id: '1', title: 'Basic T-Shirt', variantTitle: 'Siyah / M', available: 0 },
    { id: '2', title: 'Classic Hoodie', variantTitle: 'Gri / L', available: 0 },
    { id: '3', title: 'Premium Sneaker', variantTitle: 'Beyaz / 42', available: 0 },
  ],
  recentOrders: [
    { id: '1001', number: 'TC-10482', status: 'COMPLETED', grandTotal: 3890, currency: 'TRY', createdAt: '2026-11-05T09:20:00Z', customer: { firstName: 'Mert', lastName: 'Yılmaz', email: 'mert@example.com' } },
    { id: '1002', number: 'TC-10481', status: 'PROCESSING', grandTotal: 2240, currency: 'TRY', createdAt: '2026-11-05T08:45:00Z', customer: { firstName: 'Selin', lastName: 'Kaya', email: 'selin@example.com' } },
    { id: '1003', number: 'TC-10480', status: 'COMPLETED', grandTotal: 5175, currency: 'TRY', createdAt: '2026-11-05T08:05:00Z', customer: { firstName: 'Burak', lastName: 'Demir', email: 'burak@example.com' } },
    { id: '1004', number: 'TC-10479', status: 'PENDING', grandTotal: 1290, currency: 'TRY', createdAt: '2026-11-05T07:32:00Z', customer: { firstName: 'Ece', lastName: 'Arslan', email: 'ece@example.com' } },
    { id: '1005', number: 'TC-10478', status: 'COMPLETED', grandTotal: 7460, currency: 'TRY', createdAt: '2026-11-04T21:18:00Z', customer: { firstName: 'Can', lastName: 'Aydın', email: 'can@example.com' } },
  ],
};

export default function Page() {
  return (
    <Container>
      <TicartiDashboardContent data={mockData} />
    </Container>
  );
}
