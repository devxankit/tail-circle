/**
 * Phase 12 exit-criteria check — Hardening, health, config safety & deploy.
 * Run with the dev server already up:
 *   node src/server.js            (in another terminal)
 *   node scripts/phase12-check.js
 *
 * Set CHECK_PORT to test a server on a non-default port.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, validateProductionConfig } from '../src/config/env.js';

const PORT = process.env.CHECK_PORT || env.port;
const HOST = `http://localhost:${PORT}`;
const BASE = `${HOST}${env.apiPrefix}`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
function check(name, ok, extra = '') {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name}${extra ? ` — ${extra}` : ''}`);
  } else {
    fail++;
    console.log(`  ❌ ${name}${extra ? ` — ${extra}` : ''}`);
  }
}
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

console.log('\n▶ Phase 12 — Hardening, Tests, Docs & Deployment\n');

// ── 1. Liveness probe ────────────────────────────────────────────────
try {
  const res = await fetch(`${HOST}/health`);
  const body = await res.json();
  check('liveness /health returns ok', res.status === 200 && body.status === 'ok');
  check('liveness reports uptime', typeof body.uptime === 'number');
} catch (e) {
  check('liveness /health returns ok', false, e.message);
}

// ── 2. Readiness probe (deep) ────────────────────────────────────────
try {
  const res = await fetch(`${HOST}/health/ready`);
  const body = await res.json();
  check('readiness /health/ready responds', res.status === 200 || res.status === 503, `status ${res.status}`);
  check('readiness reports mongodb check', body.checks && 'mongodb' in body.checks, `mongodb=${body.checks?.mongodb}`);
  check('readiness reports redis check', body.checks && 'redis' in body.checks, `redis=${body.checks?.redis}`);
  check('readiness is 200 when mongo up', body.checks?.mongodb !== 'up' || res.status === 200);
} catch (e) {
  check('readiness /health/ready responds', false, e.message);
}

// ── 3. Security headers (helmet) ─────────────────────────────────────
try {
  const res = await fetch(`${HOST}/health`);
  check('helmet: X-Content-Type-Options nosniff', res.headers.get('x-content-type-options') === 'nosniff');
  check('helmet: hides X-Powered-By', res.headers.get('x-powered-by') === null);
  check(
    'helmet: sets a frame/DNS-prefetch guard',
    res.headers.get('x-frame-options') !== null || res.headers.get('x-dns-prefetch-control') !== null
  );
} catch (e) {
  check('helmet: X-Content-Type-Options nosniff', false, e.message);
}

// ── 4. 404 + error envelope ──────────────────────────────────────────
try {
  const res = await fetch(`${BASE}/definitely-not-a-route`);
  const body = await res.json();
  check('unknown route → 404', res.status === 404, `status ${res.status}`);
  check('error envelope { success:false, message }', body.success === false && typeof body.message === 'string');
  check('no stack leaked (dev may include it; prod must not)', env.isProd ? body.stack === undefined : true);
} catch (e) {
  check('unknown route → 404', false, e.message);
}

// ── 5. Rate-limit headers present ────────────────────────────────────
try {
  const res = await fetch(`${BASE}/`);
  const hasLimit =
    res.headers.get('ratelimit-limit') !== null || res.headers.get('x-ratelimit-limit') !== null;
  check('rate-limit headers exposed on /api', hasLimit);
} catch (e) {
  check('rate-limit headers exposed on /api', false, e.message);
}

// ── 6. CORS reflects an allowed origin ───────────────────────────────
try {
  const origin = env.corsOrigin[0] || 'http://localhost:5173';
  const res = await fetch(`${HOST}/health`, { headers: { Origin: origin } });
  check('CORS reflects allowed origin', res.headers.get('access-control-allow-origin') === origin, origin);
} catch (e) {
  check('CORS reflects allowed origin', false, e.message);
}

// ── 7. Production config guard (unit) ────────────────────────────────
const goodCfg = {
  jwt: { accessSecret: 'a'.repeat(40), refreshSecret: 'b'.repeat(40) },
  mongoUri: 'mongodb://db/prod',
  corsOrigin: ['https://tailcircle.app'],
  sms: { enabled: false, apiKey: '', senderId: '', dltTemplateId: '' },
};
check('config guard: clean prod config passes', validateProductionConfig(goodCfg).length === 0);

const badCfg = {
  jwt: { accessSecret: 'dev_access_secret', refreshSecret: 'dev_access_secret' },
  mongoUri: '',
  corsOrigin: ['http://localhost:5173'],
  sms: { enabled: true, apiKey: '', senderId: '', dltTemplateId: '' },
};
const problems = validateProductionConfig(badCfg);
check('config guard: flags weak JWT secret', problems.some((p) => p.includes('JWT_ACCESS_SECRET')));
check('config guard: flags identical access/refresh secrets', problems.some((p) => p.includes('must differ')));
check('config guard: flags missing MONGODB_URI', problems.includes('MONGODB_URI'));
check('config guard: flags localhost CORS in prod', problems.some((p) => p.includes('localhost')));
check('config guard: flags incomplete SMS config', problems.some((p) => p.includes('SMS')));

// ── 8. Deployment artifacts present ──────────────────────────────────
check('Dockerfile present', exists('Dockerfile'));
check('.dockerignore present', exists('.dockerignore'));
check('docker-compose.yml present', exists('docker-compose.yml'));
check('CI workflow present', exists('../.github/workflows/ci.yml'));
check('DEPLOYMENT.md present', exists('DEPLOYMENT.md'));
check('.env.example present', exists('.env.example'));

// ── 9. .env.example covers new knobs ─────────────────────────────────
try {
  const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  check('.env.example documents OTP_MAX_PER_HOUR', envExample.includes('OTP_MAX_PER_HOUR'));
  check('.env.example documents OTP_COOLDOWN_SECONDS', envExample.includes('OTP_COOLDOWN_SECONDS'));
  check('.env.example documents SMS_INDIA_HUB_PE_ID', envExample.includes('SMS_INDIA_HUB_PE_ID'));
} catch (e) {
  check('.env.example readable', false, e.message);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
