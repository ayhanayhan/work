import tr from '../locales/tr.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import ru from '../locales/ru.json';
export type StorefrontLocale='tr'|'en'|'de'|'ru';
const DICTS:Record<StorefrontLocale,Record<string,string>>={tr,en,de,ru};
export function storefrontLocale(locale?:string):StorefrontLocale{const x=String(locale||'tr').toLowerCase().replace('_','-').split('-')[0];return x==='en'||x==='de'||x==='ru'||x==='tr'?x:'tr'}
export function sfText(key:string,locale?:string,params?:Record<string,string|number>){const detected=locale??(typeof window==='undefined'?'tr':window.location.pathname.match(/^\/(en|de|ru|pt|es|tr)(?=\/|$)/i)?.[1]||document.documentElement.getAttribute('data-ticarti-default-locale')||document.documentElement.lang||'tr');const l=storefrontLocale(detected);let out=DICTS[l]?.[key]??DICTS.en?.[key]??DICTS.tr?.[key]??key;for(const[k,v]of Object.entries(params||{}))out=out.replaceAll(`{${k}}`,String(v));return out}
export function currentStorefrontLocale(){if(typeof window==='undefined')return 'tr';return storefrontLocale(window.location.pathname.match(/^\/(en|de|ru|pt|es|tr)(?=\/|$)/i)?.[1]||document.documentElement.getAttribute('data-ticarti-default-locale')||document.documentElement.lang||'tr')}
