const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');

function packageMetaFromResolved(resolved, expectedName) {
  let p = path.dirname(resolved);
  for (let i = 0; i < 16; i++) {
    const f = path.join(p, 'package.json');
    if (fs.existsSync(f)) {
      try {
        const meta = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (meta && meta.version && (!expectedName || meta.name === expectedName)) {
          return meta;
        }
      } catch {}
    }
    const up = path.dirname(p);
    if (up === p) break;
    p = up;
  }
  throw new Error(`package metadata with version not found for ${expectedName || resolved}`);
}

function versionFromResolved(resolved, expectedName) {
  return packageMetaFromResolved(resolved, expectedName).version;
}

function reqFromPackage(name) {
  const entry = require.resolve(name, { paths: ['/app'] });
  const meta = packageMetaFromResolved(entry, name);
  const pkgRoot = path.dirname((() => {
    let p = path.dirname(entry);
    for (let i = 0; i < 16; i++) {
      const f = path.join(p, 'package.json');
      if (fs.existsSync(f)) {
        try {
          const m = JSON.parse(fs.readFileSync(f, 'utf8'));
          if (m && m.name === name && m.version) return f;
        } catch {}
      }
      const up = path.dirname(p);
      if (up === p) break;
      p = up;
    }
    throw new Error(`package root not found for ${name}`);
  })());
  return createRequire(path.join(pkgRoot, 'package.json'));
}

function assertEq(label, actual, expected) {
  if (actual !== expected) {
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label} ${actual}`);
  }
}

function assertMin(label, actual, min) {
  const a = actual.split('.').map(Number);
  const b = min.split('.').map(Number);
  const ok = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] >= b[2])));
  if (!ok) {
    console.error(`FAIL ${label}: expected >=${min}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label} ${actual} >=${min}`);
  }
}

try {
  const gaxiosReq = reqFromPackage('gaxios');
  const gaxiosUuid = versionFromResolved(gaxiosReq.resolve('uuid'), 'uuid');
  assertEq('gaxios runtime uuid', gaxiosUuid, '11.1.1');

  const postmanReq = reqFromPackage('postman-request');
  const postmanUuid = versionFromResolved(postmanReq.resolve('uuid'), 'uuid');
  const postmanQs = versionFromResolved(postmanReq.resolve('qs'), 'qs');
  assertEq('postman-request runtime uuid', postmanUuid, '11.1.1');
  assertMin('postman-request runtime qs', postmanQs, '6.16.0');

  const prismaClient = versionFromResolved(require.resolve('@prisma/client', { paths: ['/app'] }), '@prisma/client');
  assertMin('Prisma Client runtime', prismaClient, '6.19.3');

  const nestExpress = versionFromResolved(require.resolve('@nestjs/platform-express', { paths: ['/app'] }), '@nestjs/platform-express');
  assertMin('Nest platform-express runtime', nestExpress, '11.2.6');

  const sharp = versionFromResolved(require.resolve('sharp', { paths: ['/app'] }), 'sharp');
  assertMin('Sharp runtime', sharp, '0.35.4');

  if (!process.exitCode) {
    console.log('Ticarti v30.9.8 API runtime dependency gate: OK');
  }
} catch (err) {
  console.error('FAIL API runtime dependency resolution:', err && err.stack ? err.stack : err);
  process.exit(1);
}
