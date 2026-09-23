import path from 'node:path';

const apiOrigin=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
const workspaceRoot=path.resolve(process.cwd(),'../..');

/** @type {import('next').NextConfig} */
const nextConfig={
  poweredByHeader:false,
  output:'standalone',
  outputFileTracingRoot:workspaceRoot,
  async rewrites(){
    return [{
      source:'/api/:path*',
      destination:`${apiOrigin}/:path*`
    }];
  },
  async headers(){
    return [{
      source:'/:path*',
      headers:[
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
        {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
      ]
    }];
  }
};

export default nextConfig;
