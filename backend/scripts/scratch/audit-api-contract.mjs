/**
 * Cross-check every vendor/admin API path the frontend calls against the paths
 * the backend actually registers.
 *
 * A screen that calls a route nobody serves fails only when a user opens it,
 * which is exactly the kind of gap an endpoint sweep from the server side
 * cannot see.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..', '..', '..');
const FE = path.join(ROOT, 'frontend', 'src');
const BE = path.join(ROOT, 'backend', 'src');

/** Every `router.<verb>('<path>'` in the backend, prefixed by its mount point. */
function backendRoutes() {
  const mounts = {};
  const indexSrc = fs.readFileSync(path.join(BE, 'routes', 'index.js'), 'utf8');
  for (const m of indexSrc.matchAll(/router\.use\(\s*'([^']+)'\s*,\s*(\w+)/g)) {
    (mounts[m[2]] ||= []).push(m[1]);
  }
  const importOf = {};
  for (const m of indexSrc.matchAll(/import\s+(?:\{\s*([\w,\s]+)\s*\}|(\w+))\s+from\s+'([^']+)'/g)) {
    const names = m[1] ? m[1].split(',').map((s) => s.trim()) : [m[2]];
    for (const n of names) importOf[n] = m[3];
  }

  const routes = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith('.js')) continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/router\.(get|post|patch|put|delete)\(\s*'([^']*)'/g)) {
        routes.add(`${m[1].toUpperCase()} ${m[2]}`);
      }
      // routers built by a factory (grooming/daycare share one)
      for (const m of src.matchAll(/(\w+)\.(get|post|patch|put|delete)\(\s*'([^']*)'/g)) {
        routes.add(`${m[2].toUpperCase()} ${m[3]}`);
      }
    }
  };
  walk(BE);
  return { routes, mounts };
}

/** Every `api.<verb>('<path>'` or template path the frontend calls. */
function frontendCalls() {
  const calls = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(entry.name)) continue;
      const src = fs.readFileSync(p, 'utf8');
      for (const m of src.matchAll(/api\.(get|post|patch|put|delete)\(\s*[`']([^`']+)[`']/g)) {
        calls.push({
          verb: m[1].toUpperCase(),
          raw: m[2],
          file: path.relative(ROOT, p).replace(/\\/g, '/'),
        });
      }
    }
  };
  walk(FE);
  return calls;
}

/** `/vendor/orders/${id}/status` → the last path segment set, for matching. */
const normalise = (p) =>
  p.replace(/\$\{[^}]+\}/g, ':p').replace(/\/+$/, '');

function main() {
  const { routes } = backendRoutes();
  const calls = frontendCalls();

  // Build a matcher: backend paths are mount-relative, so compare on the tail.
  const tails = new Set();
  for (const r of routes) {
    const [verb, p] = r.split(' ');
    tails.add(`${verb} ${normalise(p).replace(/:[^/]+/g, ':p')}`);
  }

  const vendorCalls = calls.filter((c) => /^\/(vendor|admin)\b/.test(c.raw));
  const missing = [];

  for (const c of vendorCalls) {
    const norm = normalise(c.raw).replace(/:[^/]+/g, ':p');
    // Try progressively shorter prefixes, since the backend path is relative
    // to wherever its router was mounted.
    const segments = norm.split('/').filter(Boolean);
    let found = false;
    for (let i = 0; i < segments.length && !found; i += 1) {
      const tail = `/${segments.slice(i).join('/')}`;
      if (tails.has(`${c.verb} ${tail}`)) found = true;
    }
    if (!found) missing.push(c);
  }

  console.log(`frontend vendor/admin API calls : ${vendorCalls.length}`);
  console.log(`backend registered routes       : ${routes.size}`);
  console.log(`\ncalls with no matching route    : ${missing.length}\n`);

  const seen = new Set();
  for (const m of missing) {
    const key = `${m.verb} ${m.raw}`;
    if (seen.has(key)) continue;
    seen.add(key);
    console.log(`  ${m.verb.padEnd(6)} ${m.raw}`);
    console.log(`         ${m.file}`);
  }
}

main();
