import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const origin = (process.env.API_ORIGIN || 'https://commerce-api-ynhobkprgq-ew.a.run.app').replace(/\/+$/, '');
  try {
    const response = await fetch(origin + '/v1/platform/apps', {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      console.error('[marketplace] Catalog API status:', response.status);
      return NextResponse.json({ message: 'Uygulama listesi şu anda alınamıyor.' }, { status: 502 });
    }
    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      console.error('[marketplace] Unexpected catalog response');
      return NextResponse.json({ message: 'Uygulama listesi geçersiz yanıt verdi.' }, { status: 502 });
    }
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[marketplace] Catalog API request failed:', error);
    return NextResponse.json({ message: 'Uygulama servisine şu anda ulaşılamıyor.' }, { status: 502 });
  }
}
