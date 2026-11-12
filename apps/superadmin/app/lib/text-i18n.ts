import tr from '../locales/misc/tr.json';
import en from '../locales/misc/en.json';
import de from '../locales/misc/de.json';
import ru from '../locales/misc/ru.json';

type Locale='tr'|'en'|'de'|'ru';
const DICT:Record<Locale,Record<string,string>>={tr,en,de,ru};
function locale():Locale{
  if(typeof document==='undefined')return 'tr';
  const raw=String(document.documentElement.lang||localStorage.getItem('ticarti_locale')||localStorage.getItem('locale')||navigator.language||'tr').toLowerCase().replace('_','-').split('-')[0];
  return raw==='en'||raw==='de'||raw==='ru'?raw:'tr';
}
export function saText(key:string,params:Record<string,string|number>={}){
  let out=DICT[locale()]?.[key]||DICT.en[key]||DICT.tr[key]||key;
  for(const [k,v] of Object.entries(params))out=out.replaceAll(`{${k}}`,String(v));
  return out;
}
