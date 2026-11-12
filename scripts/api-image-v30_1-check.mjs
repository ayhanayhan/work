#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] || process.cwd());
const dockerPath = path.join(root, 'apps/api/Dockerfile.cloudbuild');
const cloudbuildPath = path.join(root, 'cloudbuild-api.yaml');
const deployPath = path.join(root, 'deploy-final.sh');
const pkgPath = path.join(root, 'package.json');
const apiPkgPath = path.join(root, 'apps/api/package.json');
const schemaPath = path.join(root, 'apps/api/prisma/schema.prisma');
const runtimeCheckPath = path.join(root, 'scripts/api-runtime-deps-v30_9_5-check.cjs');

const read = (p) => fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
const docker = read(dockerPath);
const cloudbuild = read(cloudbuildPath);
const deploy = read(deployPath);
const pkg = JSON.parse(read(pkgPath) || '{}');
const apiPkg = JSON.parse(read(apiPkgPath) || '{}');
const runtimeCheck = read(runtimeCheckPath);

let failed = false;
function ok(label, cond) {
  if (cond) console.log(`OK ${label}`);
  else { console.error(`FAIL ${label}`); failed = true; }
}
const flat = docker.replace(/\\\n/g,' ').replace(/\s+/g,' ');

ok('API Cloud Build Dockerfile exists', !!docker);
ok('v30.9.1 root-lock marker', docker.includes('TICARTI_V30_9_1_ROOT_LOCK_INSTALL=1'));
ok('root package-lock copied', /COPY\s+package\.json\s+package-lock\.json\s+\.\//.test(docker));
ok('root npm ci used', docker.includes('npm ci --no-audit --no-fund'));
ok('workspace-filtered npm ci removed', !/npm ci[^\n\\]*--workspace\s+@commerce\/api/.test(docker));

ok('full npm ls gate removed',
   !flat.includes('npm ls --workspace @commerce/api --all'));

ok('targeted runtime dependency gate copied',
   docker.includes('COPY scripts/api-runtime-deps-v30_9_5-check.cjs scripts/api-runtime-deps-v30_9_5-check.cjs'));
ok('targeted runtime dependency gate executed',
   flat.includes('node scripts/api-runtime-deps-v30_9_5-check.cjs'));

ok('runtime gate checks gaxios uuid', runtimeCheck.includes('gaxios runtime uuid'));
ok('runtime gate checks postman uuid', runtimeCheck.includes('postman-request runtime uuid'));
ok('runtime gate checks postman qs', runtimeCheck.includes('postman-request runtime qs'));
ok('runtime gate checks Prisma/Nest/Sharp',
   runtimeCheck.includes('Prisma Client runtime') &&
   runtimeCheck.includes('Nest platform-express runtime') &&
   runtimeCheck.includes('Sharp runtime'));

ok('API Prisma schema exists', fs.existsSync(schemaPath));

const directGenerate=/\bprisma\s+generate\b/.test(flat);
const scriptGenerate=
  /npm\s+--workspace(?:=|\s+)@commerce\/api\s+run\s+prisma:generate\b/.test(flat) ||
  /npm\s+run\s+prisma:generate\s+--workspace(?:=|\s+)@commerce\/api\b/.test(flat);
const apiGenerateScript=typeof apiPkg.scripts?.['prisma:generate']==='string' &&
  /\bprisma\s+generate\b/.test(apiPkg.scripts['prisma:generate']);
ok('Prisma generate wired for API image', directGenerate || (scriptGenerate && apiGenerateScript));

ok('API built through workspace',
   flat.includes('npm run --workspace @commerce/api build') ||
   flat.includes('npm --workspace @commerce/api run build') ||
   flat.includes('npm run build --workspace @commerce/api'));

ok('Cloud Build uses explicit API Dockerfile', cloudbuild.includes('apps/api/Dockerfile.cloudbuild'));
ok('Cloud Build image substitution wired', cloudbuild.includes('_IMAGE'));
ok('deploy submits root build context',
   /gcloud builds submit\s+\./.test(deploy.replace(/\\\n/g,' ')) || deploy.includes('gcloud builds submit .'));
ok('deploy uses cloudbuild-api config', deploy.includes('cloudbuild-api.yaml'));
ok('deploy passes image substitution', deploy.includes('_IMAGE='));

const ov=pkg.overrides||{};
ok('root uuid direct pin 11.1.1', pkg.dependencies?.uuid==='11.1.1');
ok('gaxios uuid follows root pin', ov.gaxios?.uuid==='$uuid');
ok('postman-request uuid follows root pin', ov['postman-request']?.uuid==='$uuid');
ok('postman-request qs remains 6.16.0', ov['postman-request']?.qs==='6.16.0');
ok('seroval safe override retained', ov.seroval==='1.6.8');
ok('source-map-js safe override retained',
   ov['source-map-js']==='$source-map-js' || ov['source-map-js']==='1.2.2');

if (failed) process.exit(1);
console.log('Ticarti v30.9.6 API image verifier wiring: OK');
