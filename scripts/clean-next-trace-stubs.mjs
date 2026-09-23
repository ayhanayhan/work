import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

for (const app of ['admin', 'storefront', 'superadmin']) {
  const localModules = path.join(root, 'apps', app, 'node_modules');
  const localNext = path.join(localModules, 'next');
  const packageFile = path.join(localNext, 'package.json');

  // Next standalone tracing can leave a partial dependency tree beside a
  // workspace app. It is not an installed package and shadows the valid root
  // dependency on the next build. Only remove the trace-only form.
  if (fs.existsSync(localNext) && !fs.existsSync(packageFile)) {
    fs.rmSync(localNext, { recursive: true, force: true });
    fs.rmSync(path.join(localModules, 'styled-jsx'), { recursive: true, force: true });
    console.log(`[build] ${app}: eski Next trace kalıntısı temizlendi.`);
  }
}
