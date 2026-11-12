import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {assertSafeJson} from './safe-json';

test('safe JSON accepts ordinary request bodies',()=>assert.doesNotThrow(()=>assertSafeJson({name:'ürün',items:[{id:'1'}]})));
test('safe JSON rejects prototype keys and excessive nesting',()=>{
  const unsafe=JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(()=>assertSafeJson(unsafe));
  assert.throws(()=>assertSafeJson({a:{b:{c:{d:1}}}},{maxDepth:2}));
});
