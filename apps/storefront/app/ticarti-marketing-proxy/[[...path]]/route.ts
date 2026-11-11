import { NextRequest, NextResponse } from 'next/server';

/**
 * Same-origin server proxy for the public Ticarti marketing site.
 * Firebase App Hosting's external middleware rewrite can carry internal
 * authorization headers into a second backend and produce 401 invalid_token.
 * Here the Storefront server makes a new anonymous HTTP request instead.
 */
const MARKETING_ORIGIN = 'https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app';
const PUBLIC_ORIGIN = 'https://ticarti.com';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ path?: string[] }> };

async function proxy(req: NextRequest, context: Context): Promise<NextResponse> {
  const { path = [] } = await context.params;
  const url = new URL(MARKETING_ORIGIN);
  // The browser keeps /iletisim; the Marketing app owns /contact.
  // Resolve it in the server proxy so it works regardless of middleware
  // rollout order between Storefront and Marketing.
  const publicPath='/' + path.map(encodeURIComponent).join('/');
  const localized=publicPath.match(/^\/(en|de|ru|ar|bg|uk|id|vi)\/iletisim\/?$/);
  url.pathname=publicPath==='/iletisim'||publicPath==='/iletisim/'?'/contact':
    localized?'/'+localized[1]+'/contact':publicPath;
  url.search = req.nextUrl.search;

  // Allow-list only public rendering headers; never forward cookies, bearer
  // tokens, Google/Firebase proxy headers or the original Host header.
  const headers = new Headers();
  for (const name of [
    'accept', 'accept-language', 'content-type', 'if-none-match',
    'if-modified-since', 'range', 'rsc', 'next-router-state-tree',
    'next-router-prefetch', 'next-url'
  ]) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const appMarket=req.headers.get('x-ticarti-surface')==='app-marketplace';
  headers.set('x-ticarti-site-proxy', '1');
  headers.set('x-forwarded-host', appMarket?'app.ticarti.com':'ticarti.com');

  try {
    const hasBody = !['GET', 'HEAD'].includes(req.method);
    const length = Number(req.headers.get('content-length') || '0');
    if (hasBody && length > 1024 * 1024) {
      return new NextResponse('Request too large', { status: 413 });
    }
    const body = hasBody ? await req.arrayBuffer() : undefined;
    if (body && body.byteLength > 1024 * 1024) {
      return new NextResponse('Request too large', { status: 413 });
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: body && body.byteLength ? body : undefined,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(20000)
    });

    const responseHeaders = new Headers(upstream.headers);
    // fetch() may transparently decompress the body. These headers would then
    // describe the original compressed bytes, breaking browser responses.
    for (const name of [
      'content-encoding', 'content-length', 'transfer-encoding',
      'connection', 'keep-alive', 'set-cookie', 'x-middleware-rewrite'
    ]) responseHeaders.delete(name);

    const location = responseHeaders.get('location');
    if (location) {
      const redirect = new URL(location, MARKETING_ORIGIN);
      if (redirect.origin === MARKETING_ORIGIN) {
        responseHeaders.set('location', (appMarket?'https://app.ticarti.com':PUBLIC_ORIGIN) + redirect.pathname.replace(/^\/apps(?=\/|$)/,'') + redirect.search + redirect.hash);
      }
    }

    responseHeaders.set('x-ticarti-marketing-proxy', 'server');
    const emptyBody = req.method === 'HEAD' || [204, 205, 304].includes(upstream.status);
    return new NextResponse(emptyBody ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('[marketing-proxy] upstream request failed', error);
    return new NextResponse('Marketing service unavailable', { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function HEAD(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function POST(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function PUT(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function PATCH(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function DELETE(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
export async function OPTIONS(req: NextRequest, ctx: Context) { return proxy(req, ctx); }
