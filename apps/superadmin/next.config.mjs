import path from 'node:path';

const apiOrigin = (process.env.API_ORIGIN || 'http://localhost:4000').replace(/\/$/, '');
const workspaceRoot = path.resolve(process.cwd(), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  // Dependencies are installed at the workspace root by Firebase App Hosting.
  // Trace from there so the standalone bundle contains Next.js at runtime.
  output: 'standalone',
  outputFileTracingRoot: workspaceRoot,

  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  },
};

export default nextConfig;
