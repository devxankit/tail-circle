/**
 * Shared API client for all portals (user / vendor / admin).
 *
 *   import { api, setTokens, clearTokens } from '@/services/api';
 *   const { data } = await api.get('/shop/products', { params: { petType: 'dog' } });
 *   await api.post('/auth/verify-otp', { phone, code });
 *
 * Handles: base URL, JSON, Authorization header, and transparent
 * 401 → refresh → retry-once. Throws ApiClientError on failure.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ACCESS_KEY = 'tc_access_token';
const REFRESH_KEY = 'tc_refresh_token';

let accessToken = localStorage.getItem(ACCESS_KEY) || null;

export class ApiClientError extends Error {
  constructor(message, { status, details } = {}) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status ?? 0;
    this.details = details ?? null;
  }
}

export function setTokens({ accessToken: at, refreshToken: rt }) {
  if (at) {
    accessToken = at;
    localStorage.setItem(ACCESS_KEY, at);
  }
  if (rt) localStorage.setItem(REFRESH_KEY, rt);
}

export function clearTokens() {
  accessToken = null;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  return accessToken;
}

export function isLoggedIn() {
  return Boolean(accessToken);
}

/* ── internals ─────────────────────────────────────────── */

let refreshPromise = null;

async function refreshTokens() {
  // Single-flight: concurrent 401s share one refresh call.
  refreshPromise ??= (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) throw new ApiClientError('Not authenticated', { status: 401 });
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      clearTokens();
      throw new ApiClientError(body.message || 'Session expired', { status: res.status });
    }
    setTokens({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

function buildUrl(path, params) {
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
    });
  }
  return url;
}

async function request(method, path, { params, body, headers = {}, _retried = false } = {}) {
  const isForm = body instanceof FormData;
  const res = await fetch(buildUrl(path, params), {
    method,
    headers: {
      ...(isForm ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new ApiClientError('Network error — check your connection', { status: 0 });
  });

  // Expired access token → refresh once and replay the request.
  if (res.status === 401 && !_retried && localStorage.getItem(REFRESH_KEY)) {
    await refreshTokens();
    return request(method, path, { params, body, headers, _retried: true });
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiClientError(payload.message || `Request failed (${res.status})`, {
      status: res.status,
      details: payload.details,
    });
  }
  return payload; // { success, message, data }
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts = {}) => request('POST', path, { ...opts, body }),
  put: (path, body, opts = {}) => request('PUT', path, { ...opts, body }),
  patch: (path, body, opts = {}) => request('PATCH', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
};

export default api;
