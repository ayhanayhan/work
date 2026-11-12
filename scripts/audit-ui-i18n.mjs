import fs from 'node:fs';
import path from 'node:path';
const roots=['apps/storefront/app','apps/storefront/components','apps/storefront/themes/ticarti'];
const excludes=['node_modules','.next','.patch-backups','public','theme-sources'];
const rx=/["'`>][^\n<"'`]{0,120}[çğıöşüÇĞİÖŞÜ][^\n<"'`]{0,120}["'`<]/;
let hits=[];
function walk(p){if(!fs.existsSync(p))return;const st=fs.statSync(p);if(st.isDirectory()){if(excludes.some(x=>p.split(path.sep).includes(x)))return;for(const n of fs.readdirSync(p))walk(path.join(p,n));return}if(!/\.(tsx?|jsx?)$/.test(p))return;const lines=fs.readFileSync(p,'utf8').split(/\r?\n/);lines.forEach((line,i)=>{if(rx.test(line)&&!line.includes('_i18n')&&!line.includes('sfText(')&&!line.includes('uiText('))hits.push(`${p}:${i+1}:${line.trim()}`)})}
for(const r of roots)walk(r);
console.log(`Hardcoded Turkish UI candidates: ${hits.length}`);
for(const h of hits.slice(0,250))console.log(h);
if(hits.length>250)console.log(`... ${hits.length-250} more`);
