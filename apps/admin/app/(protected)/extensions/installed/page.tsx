'use client';

import Link from 'next/link';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Container} from '@/components/common/container';
import {Toolbar, ToolbarActions, ToolbarDescription, ToolbarHeading} from '@/partials/common/toolbar';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardTable} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {LoaderCircle, Search, Settings2, Store} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {useAdminSession} from '@/app/components/AdminSession';

const API = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

type InstalledRow = {
  id: string;
  enabled?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  installedAt?: string;
  app: {
    id?: string;
    slug: string;
    name: string;
    summary?: string;
    description?: string;
    category?: string;
    provider?: string;
    developer?: string;
    version?: string;
    icon?: string;
    marketplace?: {
      logoUrl?: string;
      summary?: string;
      description?: string;
      version?: string;
      updatedAt?: string;
      publishedAt?: string;
    };
  };
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('tr-TR');
}

function getSummary(row: InstalledRow) {
  return row.app.summary || row.app.marketplace?.summary || row.app.description || row.app.marketplace?.description || 'Bu uygulama için açıklama eklenmemiş.';
}

function getInstalledAt(row: InstalledRow) {
  return row.installedAt || row.createdAt || row.app.marketplace?.publishedAt || '';
}

function AppLogo({name, logo}: {name: string; logo?: string}) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';

  return (
    <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl border bg-primary/10 text-primary shadow-xs">
      {/* Harfli simge her zaman altta bulunur; kırık görsel durumunda ortaya çıkar. */}
      <span aria-hidden="true" className="text-xl font-semibold">{initial}</span>
      {logo && !failed && (
        <img
          key={logo}
          src={logo}
          alt=""
          className="absolute inset-0 size-full bg-background object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default function Page() {
  const {session, refreshSession, refreshInstalledApps} = useAdminSession();
  const [items, setItems] = useState<InstalledRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE'>('ALL');

  const request = useCallback(
    async (path: string, options: RequestInit = {}) => {
      if (!session) throw new Error('Oturum bulunamadı');

      const run = (token: string, tenant: string) =>
        fetch(API + path, {
          ...options,
          credentials: 'include',
          cache: 'no-store',
          headers: {
            authorization: `Bearer ${token}`,
            'x-tenant-id': tenant,
            ...(options.body ? {'content-type': 'application/json'} : {}),
          },
        });

      let response = await run(session.accessToken, session.tenantId);
      if (response.status === 401) {
        const next = await refreshSession();
        if (next) response = await run(next.accessToken, next.tenantId);
      }

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(Array.isArray(json?.message) ? json.message.join(', ') : json?.message || `HTTP ${response.status}`);
      }
      return json;
    },
    [refreshSession, session],
  );

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const rows = await request('/admin/apps/installed');
      setItems(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Uygulamalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [request, session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(row: InstalledRow, enabled: boolean) {
    setBusy(row.app.slug);
    setError('');
    try {
      await request('/admin/apps/installed/' + encodeURIComponent(row.app.slug) + '/state', {
        method: 'PATCH',
        body: JSON.stringify({enabled}),
      });
      await Promise.all([load(), refreshInstalledApps()]);
    } catch (e: any) {
      setError(e?.message || 'Durum güncellenemedi');
    } finally {
      setBusy('');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR');
    return items.filter((row) => {
      const active = row.enabled && row.status === 'ACTIVE';
      if (statusFilter === 'ACTIVE' && !active) return false;
      if (statusFilter === 'PASSIVE' && active) return false;

      if (!q) return true;
      const haystack = [
        row.app.name,
        row.app.slug,
        row.app.category,
        row.app.provider,
        row.app.developer,
        getSummary(row),
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase('tr-TR');
      return haystack.includes(q);
    });
  }, [items, query, statusFilter]);

  return (
    <>
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <h1 className="text-xl font-semibold">Eklentilerim</h1>
            <ToolbarDescription>
              Kurulu uygulamaları yönetin, durumlarını kontrol edin ve ayar sayfalarına buradan ulaşın.
            </ToolbarDescription>
          </ToolbarHeading>
          <ToolbarActions>
            <Button asChild>
              <Link href="/extensions/market">
                <Store className="size-4" /> Eklenti Marketi
              </Link>
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      <Container className="grid gap-5">
        <Card>
          <CardContent className="p-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Uygulama ara..."
                  className="pl-9"
                />
              </div>
              <select
                className="h-8.5 rounded-md border border-input bg-background px-3 text-[0.8125rem] shadow-xs shadow-black/5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'PASSIVE')}
              >
                <option value="ALL">Tüm durumlar</option>
                <option value="ACTIVE">Sadece aktif</option>
                <option value="PASSIVE">Sadece pasif</option>
              </select>
            </div>
          </CardContent>

          <CardTable>
            {error && (
              <div className="border-b border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="grid min-h-56 place-items-center">
                <LoaderCircle className="animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Uygulama</TableHead>
                    <TableHead className="text-center">Etkin</TableHead>
                    <TableHead>Kurulum tarihi</TableHead>
                    <TableHead className="text-end">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => {
                    const active = row.enabled && row.status === 'ACTIVE';
                    const logo = row.app.marketplace?.logoUrl || row.app.icon;
                    const isBusy = busy === row.app.slug;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="align-middle">
                          <div className="flex min-w-[320px] items-center gap-3 py-1">
                            <AppLogo name={row.app.name} logo={logo} />
                            <div className="min-w-0 self-center">
                              <div className="font-semibold leading-6">{row.app.name}</div>
                              <div className="mt-0.5 text-xs text-muted-foreground">
                                {(row.app.category || 'Uygulama') + ' · ' + (row.app.developer || row.app.provider || 'Ticarti')}
                              </div>
                              <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">{getSummary(row)}</p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="align-middle text-center">
                          <div className="flex min-h-[88px] items-center justify-center">
                            <Switch
                              checked={Boolean(active)}
                              disabled={isBusy}
                              onCheckedChange={(enabled) => void toggle(row, enabled)}
                              aria-label={`${row.app.name} etkinlik durumu`}
                            />
                          </div>
                        </TableCell>

                        <TableCell className="align-middle">
                          <div className="min-h-[88px] min-w-[160px] content-center text-sm font-medium">
                            {formatDate(getInstalledAt(row))}
                          </div>
                        </TableCell>

                        <TableCell className="align-middle text-end">
                          <div className="flex min-h-[88px] flex-wrap items-center justify-end gap-2">
                            <Button asChild size="sm" variant="primary">
                              <Link href={'/extensions/installed/' + encodeURIComponent(row.app.slug)}>
                                <Settings2 className="size-3.5" /> Yönet
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-14 text-center">
                        <div className="space-y-2">
                          <div className="font-medium">Gösterilecek uygulama bulunamadı</div>
                          <div className="text-sm text-muted-foreground">
                            Arama veya filtreleri değiştirin ya da marketten yeni uygulama yükleyin.
                          </div>
                          <Button asChild size="sm" className="mt-2">
                            <Link href="/extensions/market">Eklenti Marketine Git</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardTable>
        </Card>
      </Container>
    </>
  );
}
