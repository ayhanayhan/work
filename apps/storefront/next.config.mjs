
const commonSecurityHeaders=[
  {key:'X-Content-Type-Options',value:'nosniff'},
  {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
  {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=(), browsing-topics=()'},
  {key:'Cross-Origin-Opener-Policy',value:'same-origin-allow-popups'},
  {key:'Strict-Transport-Security',value:'max-age=31536000; includeSubDomains; preload'},
];
const apiOrigin=(process.env.API_ORIGIN||'http://localhost:4000').replace(/\/$/,'');
const superadminOrigin=(process.env.SUPERADMIN_ORIGIN||'https://commerce-superadmin--wedidit-64fae.europe-west4.hosted.app').replace(/\/$/,'');

/** @type {import('next').NextConfig} */
const nextConfig={
  poweredByHeader:false,
  output:'standalone',
  outputFileTracingRoot:process.cwd(),
  async headers(){return [{source:'/:path*',headers:[...commonSecurityHeaders,{key:'X-Frame-Options',value:'SAMEORIGIN'},{key:'Content-Security-Policy',value:"default-src 'self' https: data: blob:; base-uri 'self'; object-src 'none'; frame-ancestors 'self' https://*.ticarti.com; form-action 'self' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https: wss:; upgrade-insecure-requests"}]}];},
  async rewrites(){
    return [
      {source:'/api/:path*',destination:`${apiOrigin}/:path*`},
      {source:'/__proxy-api/:path*',destination:`${apiOrigin}/:path*`},
      {source:'/__proxy-superadmin/:path*',destination:`${superadminOrigin}/:path*`},
    ];
  },
};
export default nextConfig;
