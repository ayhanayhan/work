const MAX_TCBM_XML_BYTES=1024*1024;

export function parseTcmbTryRates(xml:string):Record<string,number>{
  if(typeof xml!=='string'||xml.length<100||Buffer.byteLength(xml,'utf8')>MAX_TCBM_XML_BYTES)throw new Error('TCMB veri boyutu geçersiz');
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('TCMB XML güvenlik kontrolünden geçmedi');
  if(!/<Tarih_Date\b[^>]*Date="[^"]+"[^>]*>/i.test(xml))throw new Error('TCMB tarih bilgisi eksik');
  const rates:Record<string,number>={TRY:1};
  const seen=new Set<string>();
  const re=/<Currency\b[^>]*CurrencyCode="([A-Z]{3})"[^>]*>([\s\S]*?)<\/Currency>/g;
  let match:RegExpExecArray|null;
  while((match=re.exec(xml))){
    const code=match[1];
    if(seen.has(code))throw new Error(`TCMB ${code} kuru yinelenmiş`);
    seen.add(code);
    const block=match[2];
    const unit=Number((block.match(/<Unit>([^<]+)<\/Unit>/)||[])[1]||1);
    const sell=Number((block.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)||[])[1]||0);
    const buy=Number((block.match(/<ForexBuying>([^<]+)<\/ForexBuying>/)||[])[1]||0);
    const value=sell||buy;
    if(Number.isFinite(unit)&&unit>0&&Number.isFinite(value)&&value>0)rates[code]=value/unit;
  }
  // A valid daily feed normally has many currencies. This blocks partial/error HTML/XML responses.
  if(Object.keys(rates).length<9)throw new Error('TCMB kur listesi eksik');
  return rates;
}

export function crossRatesFromTry(tryRates:Record<string,number>,base:string,targets:string[]):Record<string,number>{
  const normalizedBase=String(base||'TRY').toUpperCase();
  const baseTry=tryRates[normalizedBase];
  if(!(Number(baseTry)>0))throw new Error(`TCMB ${normalizedBase} kuru eksik`);
  const out:Record<string,number>={[normalizedBase]:1};
  for(const raw of targets){
    const code=String(raw).toUpperCase();
    const targetTry=tryRates[code];
    if(!(Number(targetTry)>0))throw new Error(`TCMB ${code} kuru eksik`);
    const rate=baseTry/targetTry;
    if(!Number.isFinite(rate)||rate<=0)throw new Error(`${code} kuru geçersiz`);
    out[code]=rate;
  }
  return out;
}
