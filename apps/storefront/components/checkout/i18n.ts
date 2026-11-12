import tr from './locales/tr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import ru from './locales/ru.json';

export type UiLocale='tr-TR'|'en-US'|'de-DE'|'ru-RU';
const dictionaries:Record<UiLocale,Record<string,string>>={
  'tr-TR':tr as Record<string,string>,
  'en-US':en as Record<string,string>,
  'de-DE':de as Record<string,string>,
  'ru-RU':ru as Record<string,string>,
};
function normalizeLocale(locale?:string):UiLocale{
  const raw=String(locale||'tr-TR').toLowerCase();
  if(raw.startsWith('en'))return'en-US';
  if(raw.startsWith('de'))return'de-DE';
  if(raw.startsWith('ru'))return'ru-RU';
  return'tr-TR';
}
export function uiText(key:string,locale?:string,params:Record<string,string|number>={}){
  const detected=locale??(typeof window==='undefined'?'tr-TR':window.location.pathname.match(/^\/(en|de|ru|pt|es|tr)(?=\/|$)/i)?.[1]||document.documentElement.getAttribute('data-ticarti-default-locale')||document.documentElement.lang||'tr-TR');
  const l=normalizeLocale(detected);
  const template=dictionaries[l]?.[key]??dictionaries['en-US'][key]??dictionaries['tr-TR'][key]??key;
  return Object.entries(params).reduce((value,[name,replacement])=>value.replaceAll(`{${name}}`,String(replacement)),template);
}
export function currentUiLocale(){
  if(typeof window==='undefined')return'tr-TR';
  return window.location.pathname.match(/^\/(en|de|ru|pt|es|tr)(?=\/|$)/i)?.[1]||document.documentElement.getAttribute('data-ticarti-default-locale')||document.documentElement.lang||'tr-TR';
}
