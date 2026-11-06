import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const standalone = path.join(appRoot, '.next', 'standalone');
const expected = path.join(standalone, '.next', 'routes-manifest.json');

function walk(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, found);
    } else if (
      entry.isFile() &&
      entry.name === 'routes-manifest.json' &&
      path.basename(path.dirname(full)) === '.next'
    ) {
      found.push(full);
    }
  }
  return found;
}

if (!fs.existsSync(standalone)) {
  console.error('[apphosting] .next/standalone bulunamadi.');
  process.exit(1);
}

if (!fs.existsSync(expected)) {
  const candidates = walk(standalone).filter((file) => file !== expected);

  if (!candidates.length) {
    console.error('[apphosting] routes-manifest.json standalone altinda bulunamadi.');
    process.exit(1);
  }

  // Pick the shallowest nested application output.
  candidates.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
  const manifest = candidates[0];
  const nestedNext = path.dirname(manifest);
  const nestedAppRoot = path.dirname(nestedNext);

  if (path.resolve(nestedAppRoot) === path.resolve(standalone)) {
    console.error('[apphosting] Standalone manifest beklenen konuma normalize edilemedi.');
    process.exit(1);
  }

  console.log(`[apphosting] Standalone monorepo ciktisi normalize ediliyor: ${nestedAppRoot}`);

  for (const name of fs.readdirSync(nestedAppRoot)) {
    const src = path.join(nestedAppRoot, name);
    const dst = path.join(standalone, name);

    if (path.resolve(src) === path.resolve(dst)) continue;

    fs.cpSync(src, dst, {
      recursive: true,
      force: true,
      errorOnExist: false,
    });
  }
}

if (!fs.existsSync(expected)) {
  console.error(`[apphosting] Eksik: ${expected}`);
  process.exit(1);
}

const serverCandidates = [
  path.join(standalone, 'server.js'),
  path.join(standalone, 'server.mjs'),
];

if (!serverCandidates.some((file) => fs.existsSync(file))) {
  console.error('[apphosting] Standalone server.js/server.mjs bulunamadi.');
  process.exit(1);
}

console.log('[apphosting] Standalone cikti hazir.');
console.log(`[apphosting] Manifest: ${expected}`);
