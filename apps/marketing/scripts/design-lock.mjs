import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');const hashes=JSON.parse(fs.readFileSync(path.join(root,'scripts/design-lock.json'),'utf8'));
for(const [rel,expected] of Object.entries(hashes)){
 let data=fs.readFileSync(path.join(root,rel));
 if(rel.endsWith('.html'))data=Buffer.from(data.toString('utf8').replace(/ data-tc-content-(?:key|src)="[^"]+"/g,''));
 const actual=crypto.createHash('sha256').update(data).digest('hex');
 assert.equal(actual,expected,'DİKKAT: Orijinal HTML/CSS tasarımı değişmiş: '+rel);
}
console.log('OK: '+Object.keys(hashes).length+' orijinal HTML/CSS kaynak kilidi korundu.');
