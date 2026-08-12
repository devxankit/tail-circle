/**
 * TailCircle offline service worker.
 *
 * Built from this template by pwa/vite-plugin-offline.js, which substitutes the
 * __PLACEHOLDERS__ below with real values from the production bundle. Do not
 * register this file directly in dev — it references hashed build assets.
 *
 * What it does:
 *   - Precaches the app shell plus every JS/CSS chunk the offline user pages
 *     need, so those routes open with no network at all.
 *   - Serves GET API responses from cache ONLY when the network fails, so an
 *     online user never sees stale data.
 *   - Cache-firsts hashed build assets and images the user has already seen.
 *
 * What it deliberately leaves alone: non-GET requests, socket.io, WebRTC,
 * Range requests (video seeking), auth and payment endpoints.
 */

const VERSION = '__CACHE_VERSION__';
const API_BASE = '__API_BASE__';
const PRECACHE_URLS = __PRECACHE_MANIFEST__;

const PRECACHE = `tc-precache-${VERSION}`;
const ASSETS = 'tc-assets';   // hashed build output + images, survives deploys
const API = 'tc-api';         // last-seen GET responses, cleared on logout
const FONTS = 'tc-fonts';

const SHELL = '__SHELL_URL__';

/** Runtime asset cache is trimmed to this many entries (oldest first). */
const ASSET_CACHE_LIMIT = 250;

/** API paths that must never be written to disk. */
const API_DENYLIST = ['/auth/', '/payments/', '/consult/', '/fcm-token'];

/* ── lifecycle ─────────────────────────────────────────── */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.allSettled(
        PRECACHE_URLS.map((url) => cache.add(new Request(url, { cache: 'reload' }))),
      );
      // Deliberately no skipWaiting(): a new build must not take over a tab that
      // is still lazy-loading the old build's chunks. This worker waits until
      // every controlled page is gone. Meanwhile the running app still gets the
      // new deploy — navigations are network-first and new chunks are fetched
      // normally — only the offline precache lags a session behind.
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Safe to drop older precaches here: activation only happens once no page
      // is running the previous build. ASSETS is kept regardless — it holds
      // whatever the user actually loaded, across deploys.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('tc-precache-') && n !== PRECACHE)
          .map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  const type = event.data && event.data.type;
  if (type === 'SKIP_WAITING') self.skipWaiting();
  // Sent on logout — the next user of this device must not read the last one's data.
  if (type === 'CLEAR_API_CACHE') event.waitUntil(caches.delete(API));
});

/* ── routing ───────────────────────────────────────────── */

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;          // video seeking
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.pathname.startsWith('/socket.io/')) return;

  // SPA navigations → network, falling back to the cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  if (isApiRequest(url)) {
    if (isCacheableApi(url)) event.respondWith(networkFirst(request, API));
    return;
  }

  if (url.origin === self.location.origin) {
    if (isBuildAsset(url) || isStaticAsset(url)) {
      event.respondWith(cacheFirst(request, ASSETS));
    }
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request, FONTS));
  }
});

/* ── predicates ────────────────────────────────────────── */

function isApiRequest(url) {
  return API_BASE !== '' && url.href.startsWith(API_BASE);
}

function isCacheableApi(url) {
  return !API_DENYLIST.some((p) => url.pathname.includes(p));
}

function isBuildAsset(url) {
  return url.pathname.startsWith('/assets/');
}

function isStaticAsset(url) {
  return /\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|json|webmanifest|lottie)$/i.test(
    url.pathname,
  );
}

/* ── strategies ────────────────────────────────────────── */

async function navigationHandler(request) {
  try {
    // The live shell is always preferred; the precached one is never overwritten
    // here on purpose — it has to keep pointing at the chunk hashes this
    // worker's precache actually holds, or offline would load a shell whose
    // chunks are missing.
    return await fetch(request);
  } catch {
    const cached = (await caches.match(SHELL)) || (await caches.match('/index.html'));
    if (cached) return cached;
    return new Response(OFFLINE_FALLBACK_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/**
 * Network first, cache as backup. Chosen over stale-while-revalidate on purpose:
 * an online user must never be shown yesterday's wallet balance or order status.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) {
      // Let the app tell a replayed response apart from a live one if it wants to.
      const headers = new Headers(cached.headers);
      headers.set('X-TC-Offline-Cache', '1');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  // caches.match searches every cache, so chunks precached by an older build
  // still resolve for tabs that have not reloaded yet.
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type !== 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    trimCache(cacheName, ASSET_CACHE_LIMIT);
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      // Font CSS comes back opaque (no CORS on the <link>); it still replays fine.
      if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached || network.then((r) => r || Response.error());
}

async function trimCache(cacheName, limit) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= limit) return;
  await Promise.all(keys.slice(0, keys.length - limit).map((k) => cache.delete(k)));
}

/* ── last resort ───────────────────────────────────────── */

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TailCircle — Offline</title>
<style>
  body{margin:0;height:100vh;display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:12px;background:#FAF7F2;color:#5A5552;
    font-family:'Plus Jakarta Sans',system-ui,sans-serif;text-align:center;padding:24px}
  h1{font-size:20px;margin:0}p{font-size:14px;color:#968F8A;margin:0}
  button{margin-top:8px;border:0;border-radius:999px;background:#F87B68;color:#fff;
    font:600 14px/1 inherit;padding:14px 28px}
</style></head>
<body>
  <img src="/logo/pwa-192.png" alt="" width="88" height="88">
  <h1>You're offline</h1>
  <p>Open the app once while connected to browse it offline.</p>
  <button onclick="location.reload()">Try again</button>
</body></html>`;
