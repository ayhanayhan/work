import path from 'node:path';
const apiOrigin=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
/** @type {import('next').NextConfig} */
const nextConfig={
  output:'standalone',
  transpilePackages:['@commerce/shared'],
  // Share the existing Ticarti.com frontend without conflicting with its own /_next files.
  assetPrefix:'https://commerce-marketing--wedidit-64fae.europe-west4.hosted.app',
  outputFileTracingRoot:path.resolve(process.cwd(),'../..'),
  outputFileTracingIncludes:{'/*':['./templates/**/*']},
  poweredByHeader:false,
  reactStrictMode:false,
  async rewrites(){return [{source:'/api/:path*',destination:`${apiOrigin}/:path*`}];},
};
export default nextConfig;
