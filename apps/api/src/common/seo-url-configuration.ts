/** Merchant-controlled paths never alter stable route identities or permissions. */
export const BUILTIN_PUBLIC_PATHS:Record<string,string>={
  login:'/login',register:'/register','forgot-password':'/forgot-password','reset-password':'/reset-password',
  'verify-email':'/verify-email',account:'/account',orders:'/orders',returns:'/returns',questions:'/questions',
  reviews:'/reviews',wishlist:'/wishlist',compare:'/compare',cart:'/cart',checkout:'/checkout',blog:'/blog'
};
const tidy=(value:any)=>String(value||'').trim().replace(/^\/+|\/+$/g,'');
export function configuredPublicPath(store:any,key:string,locale:string):string{
 const seo=store?.settings?.seoAdvanced?.urlRouting?.locales||{};
 const requested=String(locale||store?.locale||'tr').toLowerCase();
 const def=String(store?.locale||'tr').toLowerCase();
 const conf=seo[requested]||seo[requested.split('-')[0]]||(requested===def?seo[def]||seo[def.split('-')[0]]:{})||{};
 const chosen=tidy(conf.paths?.[key]||'');
 return chosen?'/'+chosen:(BUILTIN_PUBLIC_PATHS[key]||'/');
}
export function configuredArticleUrl(store:any,slug:string,locale:string,categorySlug=''):string{
 const seo=store?.settings?.seoAdvanced?.urlRouting?.locales||{};
 const requested=String(locale||store?.locale||'tr').toLowerCase();
 const def=String(store?.locale||'tr').toLowerCase();
 const conf=seo[requested]||seo[requested.split('-')[0]]||(requested===def?seo[def]||seo[def.split('-')[0]]:{})||{};
 const base=tidy(conf.blog?.base||conf.paths?.blog||'blog');
 const mode=conf.blog?.articleMode||'directory';
 const cleanSlug=encodeURIComponent(tidy(slug));
 if(mode==='root')return '/'+cleanSlug;
 if(mode==='category'&&categorySlug)return '/'+[base,encodeURIComponent(tidy(categorySlug)),cleanSlug].filter(Boolean).join('/');
 return '/'+[base,cleanSlug].filter(Boolean).join('/');
}
export function configuredBlogCategoryUrl(store:any,slug:string,locale:string):string{
 const seo=store?.settings?.seoAdvanced?.urlRouting?.locales||{};
 const requested=String(locale||store?.locale||'tr').toLowerCase(),def=String(store?.locale||'tr').toLowerCase();
 const conf=seo[requested]||seo[requested.split('-')[0]]||(requested===def?seo[def]||seo[def.split('-')[0]]:{})||{};
 const base=tidy(conf.blog?.base||conf.paths?.blog||'blog');
 const category=encodeURIComponent(tidy(slug));
 const mode=conf.blog?.categoryMode||'prefix';
 if(mode==='root')return '/'+category;
 if(mode==='directory')return '/'+[base,category].filter(Boolean).join('/');
 return '/'+[base,tidy(conf.blog?.categoryPrefix||'category'),category].filter(Boolean).join('/');
}
