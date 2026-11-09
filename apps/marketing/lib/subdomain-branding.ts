/** Brand assets for each Ticarti public hostname.
 * Values may be set to local public assets or HTTPS URLs. Absent values always
 * fall back to the original Ticarti logo; no new logo is fabricated.
 */
export const DEFAULT_LOGO='/assets/images/ticarti-logo.svg';

const overrides:Record<string,string|undefined>={
 'ticarti.com':process.env.NEXT_PUBLIC_TICARTI_MAIN_LOGO,
 'www.ticarti.com':process.env.NEXT_PUBLIC_TICARTI_MAIN_LOGO,
 'help.ticarti.com':process.env.NEXT_PUBLIC_TICARTI_HELP_LOGO,
 'dev.ticarti.com':process.env.NEXT_PUBLIC_TICARTI_DEV_LOGO,
 'app.ticarti.com':process.env.NEXT_PUBLIC_TICARTI_APP_LOGO
};

export function safeBrandLogo(value:string|undefined,fallback=DEFAULT_LOGO):string{
 const src=(value||'').trim();
 // Disallow javascript: and unsafe/opaque protocols in image sources.
 if(src.startsWith('/')&&!src.startsWith('//')&&!/[\\\s<>]/.test(src))return src;
 if(/^https:\/\/[a-z\d.-]+(?:\/[^\s<>]*)?$/i.test(src))return src;
 return fallback;
}
export function logoForHost(hostname:string):string{
 const host=hostname.toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'');
 return safeBrandLogo(overrides[host]);
}

/**
 * Public platform branding comes from Master -> platform-settings.
 * This is read on the server for each request; a missing API response keeps
 * the existing logo instead of breaking the corporate site.
 */
export async function getPlatformLogoForHost(hostname:string):Promise<string>{
 const host=hostname.toLowerCase().replace(/:\d+$/,'').replace(/\.$/,'');
 const key:Record<string,'main'|'help'|'app'|'dev'>={
  'ticarti.com':'main','www.ticarti.com':'main',
  'help.ticarti.com':'help','app.ticarti.com':'app','dev.ticarti.com':'dev'
 };
 const backup=logoForHost(host);
 const origin=String(process.env.API_ORIGIN||'').replace(/\/$/,'');
 if(!origin||!key[host])return backup;
 try{
  const response=await fetch(origin+'/v1/public/website/branding',{
   cache:'no-store',signal:AbortSignal.timeout(3500)
  });
  if(!response.ok)return backup;
  const json=await response.json();
  const candidate=json?.logos?.[key[host]];
  return safeBrandLogo(typeof candidate==='string'?candidate:'',backup);
 }catch{return backup;}
}
