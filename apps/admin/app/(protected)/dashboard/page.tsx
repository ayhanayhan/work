'use client';

import { useCallback, useEffect, useState } from 'react';
import { Container } from '@/components/common/container';
import { useAdminSession } from '@/app/components/AdminSession';
import { useSalesChannel } from '@/app/(protected)/components/sales-channel-context';
import { TicartiDashboardContent } from './components/content';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const iso = (d: Date) => d.toISOString().slice(0, 10);

function defaultRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 29);
  return { from, to };
}

export default function Page() {
  const { session } = useAdminSession();
  const { selectedChannelId } = useSalesChannel();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    setError('');

    const { from, to } = defaultRange();

    try {
      const q = new URLSearchParams({
        storeId: session.storeId,
        from: iso(from),
        to: iso(to),
      });
      if (selectedChannelId) q.set('salesChannelId', selectedChannelId);

      const r = await fetch(`${API}/admin/dashboard?${q}`, {
        credentials: 'include',
        headers: {
          authorization: `Bearer ${session.accessToken}`,
          'x-tenant-id': session.tenantId,
        },
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(j?.message || 'Kontrol paneli verileri alınamadı');
      }

      setData(j);
    } catch (e: any) {
      setError(e?.message || 'Kontrol paneli verileri alınamadı');
    } finally {
      setLoading(false);
    }
  }, [session, selectedChannelId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Container>
      {error ? (
        <div className="mb-5 rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {data ? (
        <TicartiDashboardContent data={data} />
      ) : (
        <div
          className="min-h-[420px]"
          aria-busy={loading}
          aria-label={loading ? 'Kontrol paneli yükleniyor' : 'Kontrol paneli verisi yok'}
        />
      )}
    </Container>
  );
}
