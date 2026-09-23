import fs from 'node:fs';
import path from 'node:path';

const localModules = path.resolve('node_modules');
const localNext = path.join(localModules, 'next');

if (fs.existsSync(localNext) && !fs.existsSync(path.join(localNext, 'package.json'))) {
  fs.rmSync(localNext, { recursive: true, force: true });
  fs.rmSync(path.join(localModules, 'styled-jsx'), { recursive: true, force: true });
  console.log('[build] Eski Next trace kalıntısı temizlendi.');
}
