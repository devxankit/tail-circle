/**
 * Service worker registration + offline helpers.
 *
 * The worker itself is generated at build time (see pwa/vite-plugin-offline.js)
 * and only exists in production output, so dev never registers it — and
 * actively unregisters a leftover one, otherwise a previously installed
 * production worker would keep serving stale chunks on localhost.
 */

const SW_URL = '/sw.js';

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((reg) => {
        if (reg.active?.scriptURL.endsWith(SW_URL)) reg.unregister();
      });
    });
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(SW_URL).then(
      (registration) => {
        // Pick up a new deploy when the app is reopened or brought forward.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') registration.update();
        });
      },
      (err) => {
        console.warn('[offline] service worker registration failed', err);
      },
    );
  });
}

/**
 * Wipe cached API responses. Called on logout so the next account signed in on
 * this device cannot read the previous one's data out of the cache.
 */
export function clearOfflineApiCache() {
  if (typeof navigator === 'undefined') return;
  navigator.serviceWorker?.controller?.postMessage({ type: 'CLEAR_API_CACHE' });
}

/* ── connectivity ──────────────────────────────────────── */

/**
 * "Offline" here means *the app cannot reach its backend* — not just what
 * `navigator.onLine` claims. That flag only reports whether a network interface
 * exists, so it stays true on a wifi captive portal or a dead mobile signal.
 *
 * Three signals feed the state:
 *   - browser online/offline events (fast, but optimistic)
 *   - real request outcomes reported by the API client, including the
 *     `X-TC-Offline-Cache` marker the service worker puts on replayed responses
 *   - a periodic reachability probe, so we notice recovery on our own
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// /health sits at the server root, outside the /api prefix, and the service
// worker ignores it — so it always reflects the real network.
const PROBE_URL = new URL('/health', API_URL).href;

const PROBE_INTERVAL_MS = 8000;
const PROBE_TIMEOUT_MS = 5000;

let online = typeof navigator === 'undefined' ? true : navigator.onLine;
let probeTimer = null;
let started = false;
const listeners = new Set();

export function isOnline() {
  return online;
}

/** Subscribe to connectivity changes. Returns an unsubscribe fn. */
export function subscribeConnectivity(fn) {
  listeners.add(fn);
  startWatching();
  return () => listeners.delete(fn);
}

/**
 * Called by the API client on every request outcome — the most trustworthy
 * signal we have, since it reflects an actual call to the backend.
 */
export function reportConnectivity(reachable) {
  setOnline(reachable);
}

function setOnline(value) {
  if (online !== value) {
    online = value;
    listeners.forEach((fn) => fn(value));
  }
  // Probing only matters while we believe we are offline.
  if (value) stopProbing();
  else startProbing();
}

function startWatching() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('offline', () => setOnline(false));
  // An 'online' event only means an interface came back; confirm before trusting it.
  window.addEventListener('online', () => { probe(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') stopProbing();
    else if (!online) probe();
  });

  if (!online) startProbing();
}

function startProbing() {
  if (probeTimer || typeof window === 'undefined') return;
  if (document.visibilityState === 'hidden') return; // don't burn battery in the background
  probeTimer = setInterval(probe, PROBE_INTERVAL_MS);
}

function stopProbing() {
  if (!probeTimer) return;
  clearInterval(probeTimer);
  probeTimer = null;
}

async function probe() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(PROBE_URL, { cache: 'no-store', signal: controller.signal });
    setOnline(res.ok);
  } catch {
    setOnline(false);
  } finally {
    clearTimeout(timeout);
  }
}
