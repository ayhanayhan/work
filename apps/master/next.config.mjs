import path from 'node:path';
const commonSecurityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains; preload'},
];
const workspaceRoot=path.resolve(process.cwd(),'../..');
/** @type {import('next').NextConfig} */
const nextConfig={
  poweredByHeader:false,
  devIndicators:false,
  output:'standalone',
  outputFileTracingRoot:workspaceRoot,
  async headers(){return [{source:'/:path*',headers:[...commonSecurityHeaders,{key:'X-Frame-Options',value:'DENY'}]}];},
};
export default nextConfig;
