/* Pure typed homepage props and safe helpers. The existing React design is the fallback
   until each selected Master module has saved content. */
export type Localized=Record<string,string>;
export type HomeItem={id:string;enabled?:boolean;fields?:Record<string,Localized>;assets?:{image?:string;logo?:string};links?:{href?:string};storeId?:string};
export type HomeLogo={id:string;enabled?:boolean;fields?:{title?:Localized};assets?:{image?:string};storeId?:string};
export type HomeModule={
 id:string;enabled?:boolean;fields?:Record<string,Localized>;items?:HomeItem[];
 logos?:HomeLogo[];ctaEnabled?:boolean;categoryIds?:string[];configured?:boolean;
};
export type HomeContent={locale:string;version:number;modules:HomeModule[];disabledModuleIds?:string[];consentContract?:{key:string;contentKey:string;href:string}};
export const moduleById=(home:HomeContent|null|undefined,id:string)=>home?.modules?.find(m=>m.id===id&&m.enabled!==false);
export const textFor=(values:Localized|undefined,locale:string)=>values?.[locale]?.trim()||'';
export const fieldFor=(module:HomeModule|undefined,key:string,locale:string)=>textFor(module?.fields?.[key],locale);
export function safePageUrl(input:string|undefined,fallback:string){
 const value=(input||'').trim();
 if(!value)return fallback;
 if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\')&&!/[\u0000-\u001f]/.test(value))return value;
 if(/^https:\/\/[^\s"'<>]+$/i.test(value))return value;
 return fallback;
}
export function safeAssetUrl(input:string|undefined,fallback:string){
 const value=(input||'').trim();
 if(value.startsWith('/assets/')||/^https:\/\/[^\s"'<>]+$/i.test(value))return value;
 if(/^(?:\.\.\/)+assets\/[a-zA-Z0-9_./-]+$/.test(value))return '/'+value.replace(/^(?:\.\.\/)+/,'');
 return fallback;
}

/** A connected homepage section must never fall back to old template/demo copy.
 * Only explicitly saved text in the selected locale may make a content section visible.
 */
export function hasLocalizedContent(module:HomeModule|undefined,locale:string):boolean{
 if(!module?.configured||module.enabled===false)return false;
 if(Object.values(module.fields||{}).some(value=>Boolean(textFor(value,locale))))return true;
 if((module.items||[]).some(item=>item.enabled!==false&&Object.values(item.fields||{}).some(value=>Boolean(textFor(value,locale)))))return true;
 if((module.logos||[]).some(item=>item.enabled!==false&&Boolean(textFor(item.fields?.title,locale))))return true;
 return false;
}
