import fs from 'node:fs';
import path from 'node:path';

const localModules = path.resolve('node_modules');
const localNext = path.join(localModules, 'next');

// A previous standalone build may leave only traced Next files here. That
// partial directory shadows the valid workspace dependency on the next build.
if (fs.existsSync(localNext) && !fs.existsSync(path.join(localNext, 'package.json'))) {
  fs.rmSync(localNext, { recursive: true, force: true });
  fs.rmSync(path.join(localModules, 'styled-jsx'), { recursive: true, force: true });
  console.log('[build] Eski Next trace kalıntısı temizlendi.');
}
