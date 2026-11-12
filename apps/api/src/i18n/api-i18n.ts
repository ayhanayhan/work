import { AsyncLocalStorage } from 'node:async_hooks';
import tr from './locales/tr.json';import en from './locales/en.json';import de from './locales/de.json';import ru from './locales/ru.json';
export type ApiLocale='tr'|'en'|'de'|'ru';const D:Record<ApiLocale,Record<string,string>>={tr,en,de,ru};
const localeStore=new AsyncLocalStorage<ApiLocale>();
export function apiLocale(v?:string|null):ApiLocale{const x=String(v||'tr').toLowerCase().replace('_','-').split(/[,-]/)[0].trim();return x==='en'||x==='de'||x==='ru'||x==='tr'?x:'tr'}
export function runWithApiLocale<T>(value:string|null|undefined,fn:()=>T):T{return localeStore.run(apiLocale(value),fn)}
export function currentApiLocale():ApiLocale{return localeStore.getStore()||'tr'}
export function apiText(key:string,locale?:string|null,params?:Record<string,string|number>){const l=locale?apiLocale(locale):currentApiLocale();let out=D[l]?.[key]??D.en?.[key]??D.tr?.[key]??key;for(const[k,v]of Object.entries(params||{}))out=out.replaceAll(`{${k}}`,String(v));return out}
