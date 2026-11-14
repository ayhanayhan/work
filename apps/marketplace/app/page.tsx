import MarketplaceView, { type MarketplaceApp } from './marketplace-view';

export const dynamic = 'force-dynamic';

async function getApps(): Promise<{ apps: MarketplaceApp[]; error: string | null }> {
  const origin = (process.env.API_ORIGIN || '').replace(/\/$/, '');
  if (!origin || !/^https:\/\//.test(origin)) return { apps: [], error: 'Uygulama kataloğu API bağlantısı yapılandırılmamış.' };
  try {
    const response = await fetch(origin + '/v1/platform/apps', {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const value: unknown = await response.json();
    if (!Array.isArray(value)) throw new Error('Beklenmeyen API yanıtı');
    const apps = value.filter((item): item is MarketplaceApp =>
      typeof item === 'object' && item !== null &&
      typeof (item as MarketplaceApp).id === 'string' &&
      typeof (item as MarketplaceApp).name === 'string'
    );
    return { apps, error: null };
  } catch {
    return { apps: [], error: 'Uygulama kataloğu şu anda yüklenemiyor.' };
  }
}

export default async function Home() {
  const { apps, error } = await getApps();
  return <MarketplaceView apps={apps} error={error} />;
}
