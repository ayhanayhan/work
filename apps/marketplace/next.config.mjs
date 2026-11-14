import path from 'node:path';
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  // Marketplace is a native Next.js site; no redirects, rewrites, or basePath.
};
export default nextConfig;
