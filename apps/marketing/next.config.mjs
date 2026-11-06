import path from 'node:path';
const apiOrigin=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
/** @type {import('next').NextConfig} */
const nextConfig={
  output:'standalone',
  outputFileTracingRoot:path.resolve(process.cwd(),'../..'),
  outputFileTracingIncludes:{'/*':['./templates/**/*']},
  poweredByHeader:false,
  reactStrictMode:false,
  async rewrites(){return [{source:'/api/:path*',destination:`${apiOrigin}/:path*`}];},
};
export default nextConfig;
