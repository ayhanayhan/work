import tr from '../locales/final/tr.json';
import en from '../locales/final/en.json';
import de from '../locales/final/de.json';
import ru from '../locales/final/ru.json';
type L='tr'|'en'|'de'|'ru';
const D:Record<L,Record<string,string>>={tr,en,de,ru};
function locale():L{if(typeof window==='undefined')return'tr';const x=String(document.documentElement.lang||localStorage.getItem('ticarti_locale')||localStorage.getItem('locale')||navigator.language||'tr').toLowerCase().split('-')[0];return x==='en'||x==='de'||x==='ru'?x:'tr'}
export function adminText(key:string,params:Record<string,string|number>={}){const l=locale();let s=D[l]?.[key]??D.en?.[key]??D.tr?.[key]??key;for(const[k,v]of Object.entries(params))s=s.replaceAll(`{${k}}`,String(v));return s}
