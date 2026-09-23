import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_ORIGIN = (process.env.ADMIN_ORIGIN || 'https://commerce-admin--wedidit-64fae.europe-west4.hosted.app').replace(/\/$/, '');
const BODYLESS = new Set(['GET', 'HEAD']);
const RESPONSE_DROP = ['connection', 'content-length', 'content-encoding', 'transfer-encoding'];
const FORWARD_HEADERS = [
  'accept',
  'accept-language',
  'cache-control',
  'content-type',
  'cookie',
  'if-modified-since',
  'if-none-match',
  'next-router-prefetch',
  'next-router-segment-prefetch',
  'next-router-state-tree',
  'next-url',
  'origin',
  'pragma',
  'range',
  'referer',
  'rsc',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-dest',
  'sec-fetch-mode',
  'sec-fetch-site',
  'sec-fetch-user',
  'user-agent',
  'x-requested-with',
];

function cleanHost(raw: string | null) {
  return String(raw || '').split(',')[0].trim().toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
}

function upstreamHeaders(req: NextRequest, tenantHost: string) {
  // Do not clone all incoming headers here. Firebase/App Hosting adds
  // infrastructure Authorization / X-Goog / forwarding headers while invoking
  // the storefront runtime. Replaying those credentials to the admin backend
  // makes Cloud Run reject the request because the token belongs to the
  // storefront service. Only forward browser/application headers that the
  // Next.js admin actually needs.
  const headers = new Headers();
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set('accept-encoding', 'identity');
  if (tenantHost) headers.set('x-ticarti-tenant-host', tenantHost);
  return headers;
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await ctx.params;
  const target = new URL(ADMIN_ORIGIN);
  target.pathname = '/' + path.map((segment) => encodeURIComponent(segment)).join('/');
  target.search = req.nextUrl.search;

  const tenantHost = cleanHost(req.headers.get('x-ticarti-tenant-host')) || cleanHost(req.headers.get('host'));
  const headers = upstreamHeaders(req, tenantHost);

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  };
  if (!BODYLESS.has(req.method)) init.body = await req.arrayBuffer();

  const upstream = await fetch(target, init);
  const responseHeaders = new Headers(upstream.headers);
  for (const name of RESPONSE_DROP) responseHeaders.delete(name);
  responseHeaders.set('cache-control', 'private, no-store, max-age=0');
  responseHeaders.set('x-ticarti-admin-proxy', 'clean-upstream-headers');

  const location = responseHeaders.get('location');
  if (location && tenantHost) {
    try {
      const resolved = new URL(location, ADMIN_ORIGIN);
      if (resolved.origin === new URL(ADMIN_ORIGIN).origin) {
        responseHeaders.set('location', `https://${tenantHost}${resolved.pathname}${resolved.search}${resolved.hash}`);
      }
    } catch {}
  }

  return new Response(req.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const HEAD = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
