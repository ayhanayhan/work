import path from 'node:path';
const apiOrigin=(process.env.API_ORIGIN||'https://commerce-api-ynhobkprgq-ew.a.run.app').replace(/\/$/,'');
/** @type {import('next').NextConfig} */
const nextConfig={
 output:'standalone',
 transpilePackages:['@commerce/shared'],
 outputFileTracingRoot:path.resolve(process.cwd(),'../..'),
 poweredByHeader:false,
 async rewrites(){
  // Preserve existing developer-host API clients during custom-domain migration.
  return [{source:'/v1/:path*',destination:`${apiOrigin}/v1/:path*`}];
 }
};
export default nextConfig;
