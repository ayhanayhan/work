import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const must=[
  'apps/storefront/themes/contracts/theme-contract.ts',
  'apps/storefront/themes/sdk/storefront.ts',
  'apps/storefront/themes/sdk/index.ts',
  'apps/storefront/themes/ticarti/manifest.ts',
  'apps/storefront/themes/imported/README.md',
  'apps/storefront/themes/registry.ts',
];
for(const rel of must){if(!fs.existsSync(path.join(root,rel)))throw new Error(`core-freeze missing: ${rel}`)}

const protectedThemeRoots=[path.join(root,'apps/storefront/themes/ticarti'),path.join(root,'apps/storefront/themes/imported')];
const banned=[
  /from\s+['"][^'"]*\/lib\/api['"]/,
  /from\s+['"][^'"]*apps\/api/,
  /from\s+['"]@prisma\//,
  /from\s+['"][^'"]*cell-routing/,
  /from\s+['"][^'"]*tenant-placement/,
];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p);
    else if(/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)){
      const rel=path.relative(root,p);
      if(rel.includes('/themes/sdk/'))continue;
      const txt=fs.readFileSync(p,'utf8');
      for(const rule of banned)if(rule.test(txt))throw new Error(`theme boundary violation: ${rel} (${rule})`);
    }
  }
}
for(const dir of protectedThemeRoots)walk(dir);

const registry=fs.readFileSync(path.join(root,'apps/storefront/themes/registry.ts'),'utf8');
if(!registry.includes('getThemeModule'))throw new Error('theme registry must expose getThemeModule');
const contract=fs.readFileSync(path.join(root,'apps/storefront/themes/contracts/theme-contract.ts'),'utf8');
if(!contract.includes("THEME_CONTRACT_VERSION='1.0.0'"))throw new Error('theme contract version is not frozen at 1.0.0');
console.log('core-freeze-check: OK');
