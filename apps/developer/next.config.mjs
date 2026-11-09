import path from 'node:path';
/** @type {import('next').NextConfig} */
const nextConfig={
  output:'standalone',
  outputFileTracingRoot:path.resolve(process.cwd(),'../..'),
  poweredByHeader:false,
  async redirects(){return [{source:'/developer',destination:'/',permanent:true}];}
};
export default nextConfig;
