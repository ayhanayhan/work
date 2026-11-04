
const commonSecurityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains; preload'},
];
import path from 'node:path';
const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
const workspaceRoot = path.resolve(process.cwd(), '../..');
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  basePath: '/admin',
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,
  images: {},
  async headers(){return [{source:'/:path*',headers:[...commonSecurityHeaders,{key:'X-Frame-Options',value:'DENY'},{key:'Content-Security-Policy',value:"default-src 'self' https: data: blob:; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' https: data: blob:; font-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; upgrade-insecure-requests"}]}];},
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};
export default nextConfig;
