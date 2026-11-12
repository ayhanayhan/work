import test from 'node:test';
import assert from 'node:assert/strict';
import { eligiblePriceLists, resolveMarket } from './market-resolution';

test('market resolution prioritizes country over currency and locale', () => {
  const markets:any[] = [
    {id:'currency',active:true,countries:[],currencies:['TRY'],locales:['tr']},
    {id:'country',active:true,countries:['TR'],currencies:['USD'],locales:['en']},
  ];
  assert.equal(resolveMarket(markets,{country:'tr',currency:'TRY',locale:'tr'})?.id,'country');
});

test('company price list has deterministic highest precedence', () => {
  const lists:any[] = [
    {id:'generic',active:true,currency:'TRY',priority:1},
    {id:'company',active:true,currency:'TRY',priority:999},
  ];
  const eligible=eligiblePriceLists(lists,null,{currency:'TRY',companyPriceListId:'company'});
  assert.equal(eligible[0]?.id,'company');
});
