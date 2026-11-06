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


/**
 * Next.js intentionally leaves public/ and .next/static/ out of standalone.
 * The Firebase App Hosting adapter packages the normalized standalone tree,
 * so the site assets must be present beside standalone/server.js.
 */
function copyDeployDir(source, destination, label) {
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    console.error(`[apphosting] Eksik kaynak klasor: ${source}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
  console.log(`[apphosting] ${label} standalone paketine eklendi.`);
}

copyDeployDir(
  path.join(appRoot, 'public'),
  path.join(standalone, 'public'),
  'Public assets',
);
copyDeployDir(
  path.join(appRoot, '.next', 'static'),
  path.join(standalone, '.next', 'static'),
  'Next.js static files',
);

for (const asset of [
  'assets/css/style.css',
  'assets/css/marketing-blog.css',
  'assets/js/common.js',
  'assets/images/ticarti-logo.svg',
  'assets/images/marketplaces/trendyol.svg',
]) {
  const destination = path.join(standalone, 'public', asset);
  if (!fs.existsSync(destination)) {
    console.error(`[apphosting] Eksik yayin dosyasi: ${destination}`);
    process.exit(1);
  }
}

console.log('[apphosting] Standalone cikti hazir.');
console.log(`[apphosting] Manifest: ${expected}`);
