import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const appRoot = process.cwd();
const standalone = path.join(appRoot, '.next', 'standalone');
const expected = path.join(standalone, '.next', 'routes-manifest.json');
const req = createRequire(path.join(appRoot, 'package.json'));

function walk(dir, found = []) {
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (
      entry.isFile() &&
      entry.name === 'routes-manifest.json' &&
      path.basename(path.dirname(full)) === '.next'
    ) found.push(full);
  }
  return found;
}

function packagePathInsideNodeModules(base, packageName) {
  const parts = packageName.split('/');
  return packageName.startsWith('@')
    ? path.join(base, 'node_modules', parts[0], parts[1])
    : path.join(base, 'node_modules', packageName);
}

function findPackageRoot(packageName) {
  // First: deterministic node_modules walk from app root up to filesystem root.
  let cursor = appRoot;
  while (true) {
    const candidate = packagePathInsideNodeModules(cursor, packageName);
    const pkg = path.join(candidate, 'package.json');
    if (fs.existsSync(pkg)) return candidate;

    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  // Second: Node resolution as fallback.
  for (const spec of [packageName, `${packageName}/package.json`]) {
    try {
      const resolved = req.resolve(spec);
      let dir = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
      while (dir && dir !== path.dirname(dir)) {
        const pkg = path.join(dir, 'package.json');
        if (fs.existsSync(pkg)) {
          try {
            const meta = JSON.parse(fs.readFileSync(pkg, 'utf8'));
            if (meta.name === packageName) return dir;
          } catch {}
        }
        dir = path.dirname(dir);
      }
    } catch {}
  }

  return null;
}

function packageTarget(packageName) {
  return packagePathInsideNodeModules(standalone, packageName);
}

function normalizeStandalone() {
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

    candidates.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);
    const manifest = candidates[0];
    const nestedNext = path.dirname(manifest);
    const nestedAppRoot = path.dirname(nestedNext);

    console.log(`[apphosting] Standalone monorepo ciktisi normalize ediliyor: ${nestedAppRoot}`);

    for (const name of fs.readdirSync(nestedAppRoot)) {
      const src = path.join(nestedAppRoot, name);
      const dst = path.join(standalone, name);
      if (path.resolve(src) === path.resolve(dst)) continue;
      fs.cpSync(src, dst, {
        recursive: true,
        force: true,
        errorOnExist: false,
        dereference: true,
      });
    }
  }
}

function vendorRuntimeDependencies() {
  const appPkg = JSON.parse(fs.readFileSync(path.join(appRoot, 'package.json'), 'utf8'));
  const queue = Object.keys(appPkg.dependencies || {});
  const seen = new Set();
  const copied = [];
  const missingRequired = [];

  while (queue.length) {
    const name = queue.shift();
    if (!name || seen.has(name)) continue;
    seen.add(name);

    const src = findPackageRoot(name);
    if (!src) {
      // Optional platform packages are allowed to be absent.
      if (
        name.startsWith('@next/swc-') ||
        name.startsWith('@img/sharp-')
      ) {
        continue;
      }
      console.warn(`[apphosting] runtime dependency resolve edilemedi: ${name}`);
      missingRequired.push(name);
      continue;
    }

    const dst = packageTarget(name);
    fs.mkdirSync(path.dirname(dst), { recursive: true });

    if (!fs.existsSync(dst)) {
      fs.cpSync(src, dst, {
        recursive: true,
        force: true,
        errorOnExist: false,
        dereference: true,
      });
      copied.push(name);
    }

    try {
      const meta = JSON.parse(fs.readFileSync(path.join(src, 'package.json'), 'utf8'));
      for (const dep of Object.keys(meta.dependencies || {})) {
        if (!seen.has(dep)) queue.push(dep);
      }
      for (const dep of Object.keys(meta.optionalDependencies || {})) {
        if (!seen.has(dep)) queue.push(dep);
      }
    } catch {}
  }

  console.log(`[apphosting] Standalone runtime dependency vendor: ${copied.length} paket.`);

  // Hard runtime requirements for Next server boot.
  for (const pkg of ['next', 'react', 'react-dom', 'styled-jsx']) {
    const pkgJson = path.join(packageTarget(pkg), 'package.json');
    if (!fs.existsSync(pkgJson)) {
      console.error(`[apphosting] Kritik runtime dependency standalone icinde yok: ${pkg}`);
      process.exit(1);
    }
  }

  if (missingRequired.includes('styled-jsx')) {
    console.error('[apphosting] styled-jsx resolve edilemedi.');
    process.exit(1);
  }
}

normalizeStandalone();

if (!fs.existsSync(expected)) {
  console.error(`[apphosting] Eksik: ${expected}`);
  process.exit(1);
}

const hasServer = [
  path.join(standalone, 'server.js'),
  path.join(standalone, 'server.mjs'),
].some(fs.existsSync);

if (!hasServer) {
  console.error('[apphosting] Standalone server.js/server.mjs bulunamadi.');
  process.exit(1);
}

vendorRuntimeDependencies();

console.log('[apphosting] Standalone cikti hazir.');
console.log(`[apphosting] Manifest: ${expected}`);
console.log(`[apphosting] Next runtime: ${packageTarget('next')}`);
console.log(`[apphosting] styled-jsx runtime: ${packageTarget('styled-jsx')}`);
