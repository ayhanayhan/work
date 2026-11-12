import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const localModules = path.join(appRoot, 'node_modules');
const localNext = path.join(localModules, 'next');
const localStyled = path.join(localModules, 'styled-jsx');

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

// In this npm-workspace repo the authoritative Next installation lives at the
// workspace root. A stale app-local partial Next copy shadows it and produces
// errors such as missing dist/shared/lib/utils.js.
if (fs.existsSync(localNext)) {
  rm(localNext);
  rm(localStyled);
  console.log('[build] App-local Next/styled-jsx temizlendi; workspace root kullanilacak.');
}
