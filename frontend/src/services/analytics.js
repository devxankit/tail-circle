import { api } from './api';

/**
 * Customer activity tracking, client side.
 *
 * Nothing here sends anything until the visitor has actively accepted. The
 * consent decision is held in localStorage so the very first page load can
 * decide whether to track without waiting on a round trip — but the server
 * re-checks consent on every ingest, so a tampered local flag buys nothing.
 *
 * Events are queued and flushed in batches: a browsing session produces dozens
 * of them, and one request each would be wasteful and easily lost on
 * navigation. The final flush uses `sendBeacon`, which survives the page being
 * closed — a normal fetch does not.
 *
 * Every function is safe to call before consent, after a decline, and in a
 * private window where storage throws. Analytics must never be the reason
 * something on screen breaks.
 */

const DEVICE_KEY = 'tc_device_id';
const CONSENT_KEY = 'tc_cookie_consent';
const SESSION_KEY = 'tc_session_id';
const SESSION_AT_KEY = 'tc_session_at';

/** A gap this long starts a new visit rather than extending the old one. */
const SESSION_IDLE_MS = 30 * 60 * 1000;
const FLUSH_INTERVAL_MS = 15_000;
const FLUSH_AT_COUNT = 20;
const MAX_QUEUE = 200;

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/* ── storage helpers (never throw) ──────────────────────────────────── */

const readLocal = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const writeLocal = (k, v) => {
  try { localStorage.setItem(k, v); } catch { /* private mode */ }
};
const removeLocal = (k) => {
  try { localStorage.removeItem(k); } catch { /* private mode */ }
};

const randomId = () => {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
};

/* ── identity ───────────────────────────────────────────────────────── */

/**
 * A stable id for this browser.
 *
 * Deliberately random and meaningless — it is not derived from anything about
 * the person, and it is what the consent record is keyed on, so a withdrawal
 * can find and erase everything collected under it.
 */
export function getDeviceId() {
  let id = readLocal(DEVICE_KEY);
  if (!id) {
    id = randomId();
    writeLocal(DEVICE_KEY, id);
  }
  return id;
}

/** The current visit, rolled over after a long idle gap. */
function getSessionId() {
  const now = Date.now();
  const last = Number(readLocal(SESSION_AT_KEY) || 0);
  let id = readLocal(SESSION_KEY);
  if (!id || !last || now - last > SESSION_IDLE_MS) {
    id = randomId();
    writeLocal(SESSION_KEY, id);
  }
  writeLocal(SESSION_AT_KEY, String(now));
  return id;
}

/* ── consent ────────────────────────────────────────────────────────── */

export function getLocalConsent() {
  try {
    const raw = readLocal(CONSENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const hasConsent = () => getLocalConsent()?.analytics === true;

/** Has this visitor been asked yet, at the current policy version? */
export function needsConsentPrompt(policyVersion) {
  const c = getLocalConsent();
  if (!c) return true;
  return policyVersion ? c.policyVersion !== policyVersion : false;
}

/** Ask the server what this device has already decided. */
export async function fetchConsentState() {
  try {
    const { data } = await api.get('/analytics/consent', { params: { deviceId: getDeviceId() } });
    if (data?.consent) writeLocal(CONSENT_KEY, JSON.stringify(data.consent));
    return data;
  } catch {
    // Server unreachable: fall back to what we know locally rather than
    // re-prompting somebody who already answered.
    const local = getLocalConsent();
    return { consent: local, policyVersion: local?.policyVersion, mustAsk: !local };
  }
}

/**
 * Record the visitor's decision.
 *
 * On a decline, the queue is dropped and the session ids are cleared so nothing
 * already gathered in memory can leak out on the next flush.
 */
export async function setConsent(accepted, source = 'banner') {
  const deviceId = getDeviceId();
  try {
    const { data } = await api.post('/analytics/consent', {
      deviceId,
      analytics: Boolean(accepted),
      source,
    });
    writeLocal(CONSENT_KEY, JSON.stringify(data));
  } catch {
    // Keep the decision locally even if the call failed; an unrecorded
    // DECLINE must still stop the client tracking.
    writeLocal(
      CONSENT_KEY,
      JSON.stringify({ analytics: Boolean(accepted), decidedAt: new Date().toISOString() })
    );
  }

  if (!accepted) {
    queue.length = 0;
    removeLocal(SESSION_KEY);
    removeLocal(SESSION_AT_KEY);
  }
  return Boolean(accepted);
}

/** Withdraw consent — the server also erases what was collected. */
export const withdrawConsent = () => setConsent(false, 'withdrawn');

/* ── queue ──────────────────────────────────────────────────────────── */

const queue = [];
let timer = null;
let listenersBound = false;

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    flush();
  }, FLUSH_INTERVAL_MS);
}

function bindLifecycleListeners() {
  if (listenersBound || typeof window === 'undefined') return;
  listenersBound = true;
  // `pagehide` and `visibilitychange` fire on mobile where `beforeunload`
  // frequently does not.
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush(true);
  });
}

/**
 * Send whatever is queued.
 *
 * `useBeacon` is for the page going away: `sendBeacon` is queued by the browser
 * and survives the document being destroyed, where an in-flight fetch is simply
 * cancelled and the last screen of every visit would be lost.
 */
export function flush(useBeacon = false) {
  if (!queue.length || !hasConsent()) {
    queue.length = 0;
    return;
  }

  const body = {
    deviceId: getDeviceId(),
    sessionId: getSessionId(),
    platform: 'web',
    referrer: typeof document !== 'undefined' ? document.referrer || '' : '',
    events: queue.splice(0, queue.length),
  };

  if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(
        `${BASE_URL}/analytics/events`,
        new Blob([JSON.stringify(body)], { type: 'application/json' })
      );
      return;
    } catch {
      /* fall through to fetch */
    }
  }

  // Failures are swallowed on purpose. A dropped batch of analytics is not
  // worth a console error on a customer's screen, let alone a retry loop.
  api.post('/analytics/events', body).catch(() => {});
}

/** Queue one event. No-op without consent. */
export function track(type, payload = {}) {
  if (!hasConsent()) return;
  bindLifecycleListeners();

  if (queue.length >= MAX_QUEUE) queue.shift();
  queue.push({ type, occurredAt: new Date().toISOString(), ...payload });

  if (queue.length >= FLUSH_AT_COUNT) flush();
  else scheduleFlush();
}

/* ── convenience wrappers ───────────────────────────────────────────── */

export const trackScreen = (path, screen, durationMs = 0) =>
  track('screen_view', { path, screen, durationMs });

export const trackSearch = (query, resultCount) =>
  track('search', { query, resultCount });

export const trackItemView = ({ refType, refId, refName, category, durationMs }) =>
  track('item_view', { refType, refId, refName, category, durationMs });

export const trackAddToCart = ({ refType = 'product', refId, refName }) =>
  track('add_to_cart', { refType, refId, refName });

export const trackCheckoutStart = (path) => track('checkout_start', { path });

export const trackBooking = ({ refType, refId, refName }) =>
  track('booking', { refType, refId, refName });

export const trackOrder = ({ refId, refName }) =>
  track('order', { refType: 'product', refId, refName });
