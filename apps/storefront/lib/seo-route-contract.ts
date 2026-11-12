/** Per-store, per-locale SEO aliases. Empty values always fall back to built-in routes. */
export type SeoLocaleConfig = { paths?: Record<string,string>; blog?: {base?:string; articleMode?:'directory'|'root'|'category';categoryMode?:'directory'|'prefix'|'root';categoryPrefix?:string} };
export type SeoUrlRouting = {locales?:Record<string,SeoLocaleConfig>};
const systemPaths:Record<string,string>={login:'/login',register:'/register','forgot-password':'/forgot-password','reset-password':'/reset-password','verify-email':'/verify-email',account:'/account',addresses:'/addresses',orders:'/orders',returns:'/returns',questions:'/questions',reviews:'/reviews',wishlist:'/wishlist',compare:'/compare',cart:'/cart',checkout:'/checkout',blog:'/blog'};
const clean=(p:string)=>String(p||'').trim().replace(/^\/+|\/+$/g,'');
export function routeConfig(routing:SeoUrlRouting|undefined,locale:string,defaultLocale:string):SeoLocaleConfig {
 const locales=routing?.locales||{};
 const lang=locale.toLowerCase();const fallback=defaultLocale.toLowerCase();
 return locales[locale]||locales[lang]||locales[lang.split('-')[0]]||(lang===fallback?locales[defaultLocale]||locales[fallback.split('-')[0]]:{} )||{};
}
export function systemUrl(routing:SeoUrlRouting|undefined,key:string,locale:string,defaultLocale:string):string {
 const config=routeConfig(routing,locale,defaultLocale);
 const custom=clean(config.paths?.[key]||'');
 return custom?'/'+custom:(systemPaths[key]||'/');
}
/** Internal rewrite only; public URL is never redirected. */
export function resolvePublicUrl(routing:SeoUrlRouting|undefined,path:string,locale:string,defaultLocale:string):string|null {
 const config=routeConfig(routing,locale,defaultLocale);
 const input='/'+clean(path);
 for(const [key,canonical] of Object.entries(systemPaths)){
   const alias=clean(config.paths?.[key]||'');
   if(alias&&input==='/'+alias)return canonical;
   if(key==='orders'&&alias&&input.startsWith('/'+alias+'/'))return '/account/orders/'+input.slice(alias.length+2);
 }
 const blog=config.blog||{};
 const base=clean(blog.base||config.paths?.blog||'blog');
 // Custom blog index has already been handled by the system route table above.
 if(base!== 'blog'&&input==='/'+base)return '/blog';
 const pathParts=clean(input).split('/');
 // Root-level articles require a content existence lookup to avoid capturing native routes.
 // They are deliberately not rewritten here until that lookup is available.
 if(pathParts.length===3&&pathParts[0]===base&&pathParts[1]==='authors')return '/blog/authors/'+encodeURIComponent(pathParts[2]);
 if(blog.articleMode==='category'&&pathParts.length===3&&pathParts[0]===base)return '/blog/'+encodeURIComponent(pathParts[2]);
 if(blog.articleMode==='category'&&pathParts.length===2&&pathParts[0]===base)return '/blog/'+encodeURIComponent(pathParts[1]);
 if((blog.articleMode===undefined||blog.articleMode==='directory')&&base!=='blog'&&pathParts.length===2&&pathParts[0]===base)return '/blog/'+encodeURIComponent(pathParts[1]);
 if(blog.categoryMode==='prefix'&&pathParts.length===3&&pathParts[0]===base&&pathParts[1]===(clean(blog.categoryPrefix||'category')))return '/blog?category='+encodeURIComponent(pathParts[2]);
 // Prefix-free categories overlap with article slugs; resolve through content registry, not a blind rewrite.
 return null;
}
/** Canonical article path; category-mode falls back to directory when no primary category is known. */
export function articleUrl(routing:SeoUrlRouting|undefined,slug:string,locale:string,defaultLocale:string,primaryCategory=''){
 const config=routeConfig(routing,locale,defaultLocale);
 const mode=config.blog?.articleMode||'directory';
 const base=clean(config.blog?.base||config.paths?.blog||'blog');
 const article=encodeURIComponent(clean(slug));
 if(mode==='root')return '/'+article;
 if(mode==='category'&&primaryCategory)return '/'+[base,encodeURIComponent(clean(primaryCategory)),article].filter(Boolean).join('/');
 return '/'+[base,article].filter(Boolean).join('/');
}
