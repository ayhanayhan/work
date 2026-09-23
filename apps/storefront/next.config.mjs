import path from 'node:path';

const apiOrigin=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
const superadminOrigin=(process.env.SUPERADMIN_ORIGIN||'https://commerce-superadmin--wedidit-64fae.europe-west4.hosted.app').replace(/\/$/,'');
const workspaceRoot=path.resolve(process.cwd(),'../..');

/** @type {import('next').NextConfig} */
const nextConfig={
  poweredByHeader:false,
  output:'standalone',
  // Firebase installs dependencies at the monorepo root. Include them in the
  // standalone runtime bundle instead of emitting an app-only trace.
  outputFileTracingRoot:workspaceRoot,
  async rewrites(){
    return [
      {source:'/api/:path*',destination:`${apiOrigin}/:path*`},
      {source:'/__proxy-api/:path*',destination:`${apiOrigin}/:path*`},
      {source:'/__proxy-superadmin/:path*',destination:`${superadminOrigin}/:path*`},
    ];
  },
};
export default nextConfig;
