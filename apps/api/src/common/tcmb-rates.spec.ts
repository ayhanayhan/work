import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {crossRatesFromTry,parseTcmbTryRates} from './tcmb-rates';

const feed=(missing='')=>`<?xml version="1.0"?><Tarih_Date Date="28.09.2026">${['USD','EUR','GBP','CHF','JPY','CAD','AUD','SEK','DKK'].filter(x=>x!==missing).map((code,i)=>`<Currency CurrencyCode="${code}"><Unit>${code==='JPY'?100:1}</Unit><ForexBuying>${i+30}.0</ForexBuying><ForexSelling>${i+31}.0</ForexSelling></Currency>`).join('')}</Tarih_Date>`;

test('TCMB parser accepts a complete feed and calculates cross rates',()=>{
  const rates=parseTcmbTryRates(feed());
  assert.equal(rates.TRY,1);
  assert.ok(rates.USD>0&&rates.EUR>0);
  const cross=crossRatesFromTry(rates,'TRY',['USD','EUR']);
  assert.ok(cross.USD>0&&cross.EUR>0);
});

test('TCMB parser rejects partial and unsafe XML instead of accepting bad rates',()=>{
  assert.throws(()=>parseTcmbTryRates(feed('USD').replace(/<Currency CurrencyCode="EUR">[\s\S]*?<\/Currency>/,'')));
  assert.throws(()=>parseTcmbTryRates(`<!DOCTYPE x [<!ENTITY y SYSTEM "file:///etc/passwd">]>${feed()}`));
  assert.throws(()=>crossRatesFromTry(parseTcmbTryRates(feed()),'TRY',['XXX']));
});
