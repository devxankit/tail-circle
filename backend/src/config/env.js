import dotenv from 'dotenv';

dotenv.config();

/**
 * Centralized, validated environment configuration.
 * Import `env` anywhere instead of reading `process.env` directly.
 */
const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

const missing = required.filter((key) => !process.env[key]);
if (missing.length && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn(
    `⚠️  Missing environment variables: ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill them in.'
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  apiPrefix: process.env.API_PREFIX || '/api',

  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tailcircle',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  otp: {
    expiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES) || 5,
    length: Number(process.env.OTP_LENGTH) || 4,
    // Anti-abuse limits (per phone number).
    cooldownSeconds: Number(process.env.OTP_COOLDOWN_SECONDS) || 60,
    maxPerHour: Number(process.env.OTP_MAX_PER_HOUR) || 5,
  },

  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173,https://tail-circle-nine.vercel.app')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  rateLimit: {
    // General API traffic. A logged-in dashboard fans out a lot of calls, so
    // this needs headroom well above a single page load.
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
    // Auth/OTP endpoints only. Deliberately separate and much tighter — this is
    // the guard against password and OTP brute force.
    authWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'tailcircle',
  },

  upload: {
    maxFileSizeBytes: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  },

  sms: {
    enabled: process.env.SMS_INDIA_ENABLED === 'true',
    baseUrl:
      process.env.SMS_INDIA_BASE_URL || 'http://cloud.smsindiahub.in/vendorsms/pushsms.aspx',
    username: process.env.SMS_INDIA_HUB_USERNAME || '',
    apiKey: process.env.SMS_INDIA_HUB_API_KEY || '',
    senderId: process.env.SMS_INDIA_HUB_SENDER_ID || '',
    peId: process.env.SMS_INDIA_HUB_PE_ID || '',
    dltTemplateId: process.env.SMS_INDIA_HUB_DLT_TEMPLATE_ID || '',
    gwid: process.env.SMS_INDIA_HUB_GWID || '2',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    databaseUrl: process.env.FIREBASE_DATABASE_URL || '',
    serviceAccountPath:
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'tc:',
  },

  /**
   * LiveKit — self-hosted Community Edition WebRTC SFU for video consults.
   *
   * The API key/secret are backend-only and used in exactly one place
   * (services/livekit.service.js) to mint short-lived per-participant JWTs.
   * The browser never sees the signing secret.
   *
   * Two URLs on purpose:
   *   url     — what CLIENTS dial. Must be publicly reachable (wss:// in prod).
   *   httpUrl — what THIS SERVER uses for the Room API. Can stay on loopback.
   * Handing a phone a localhost URL is the single most common self-host failure,
   * so the production guard below rejects it outright.
   */
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
    apiSecret: process.env.LIVEKIT_API_SECRET || 'secret',
    url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
    httpUrl: process.env.LIVEKIT_HTTP_URL || 'http://localhost:7880',
    // Verifies LiveKit server webhooks (authoritative join/leave timestamps).
    webhookEnabled: process.env.LIVEKIT_WEBHOOK_ENABLED !== 'false',
    // How long a participant token stays valid.
    tokenTtl: process.env.LIVEKIT_TOKEN_TTL || '2h',
    // Relay servers handed to clients on strict NAT / mobile networks.
    turnUrls: (process.env.TURN_URLS || '')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean),
    turnSecret: process.env.TURN_SECRET || '',
    stunUrls: (process.env.STUN_URLS || 'stun:stun.l.google.com:19302')
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean),
  },

  /** Video consultation behaviour (overage metering lives in Phase 8). */
  consult: {
    // How early either party may join before the slot starts.
    joinLeadMinutes: Number(process.env.CONSULT_JOIN_LEAD_MINUTES) || 10,
    // Grace after the scheduled end during which the room stays joinable.
    joinGraceMinutes: Number(process.env.CONSULT_JOIN_GRACE_MINUTES) || 15,
    // How long the callee's device rings before the call is marked missed.
    ringTimeoutMs: Number(process.env.CONSULT_RING_TIMEOUT_MS) || 45_000,
  },
};

/**
 * Fail-fast production guard. Called once at server startup (not at import,
 * so dev tooling and the phase-check scripts keep working). In production a
 * missing or placeholder secret is fatal — better to crash on boot than to
 * run with insecure defaults. Returns the list of problems (empty = OK) so it
 * can also be unit-tested without exiting the process.
 */
const PLACEHOLDERS = new Set([
  '',
  'dev_access_secret',
  'dev_refresh_secret',
  'change_me',
  'change_me_access_secret',
  'change_me_refresh_secret',
]);

export function validateProductionConfig(cfg = env) {
  const problems = [];
  const requireReal = (label, value) => {
    if (!value || PLACEHOLDERS.has(String(value))) problems.push(label);
  };

  requireReal('JWT_ACCESS_SECRET', cfg.jwt.accessSecret);
  requireReal('JWT_REFRESH_SECRET', cfg.jwt.refreshSecret);
  requireReal('MONGODB_URI', cfg.mongoUri);

  if (cfg.jwt.accessSecret && cfg.jwt.accessSecret === cfg.jwt.refreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if ((cfg.jwt.accessSecret || '').length < 32) {
    problems.push('JWT_ACCESS_SECRET should be at least 32 chars');
  }
  if (cfg.corsOrigin.some((o) => o.includes('localhost'))) {
    problems.push('CORS_ORIGIN still allows localhost in production');
  }
  if (cfg.sms.enabled && (!cfg.sms.apiKey || !cfg.sms.senderId || !cfg.sms.dltTemplateId)) {
    problems.push('SMS enabled but SMS_INDIA_HUB_API_KEY / SENDER_ID / DLT_TEMPLATE_ID incomplete');
  }

  // ── LiveKit ──
  // Shipping the published dev keypair would let anyone mint a token for any
  // consultation room, so treat it exactly like a placeholder secret.
  if (cfg.livekit.apiKey === 'devkey' || cfg.livekit.apiSecret === 'secret') {
    problems.push('LIVEKIT_API_KEY / LIVEKIT_API_SECRET still use the public dev pair');
  }
  if ((cfg.livekit.apiSecret || '').length < 32) {
    problems.push('LIVEKIT_API_SECRET should be at least 32 chars');
  }
  // Clients dial `url` directly. A ws:// or localhost value works on the dev
  // machine and fails on every real phone, with an opaque connection error.
  if (!cfg.livekit.url.startsWith('wss://')) {
    problems.push('LIVEKIT_URL must be a public wss:// URL in production');
  }
  if (/localhost|127\.0\.0\.1/.test(cfg.livekit.url)) {
    problems.push('LIVEKIT_URL points at localhost — remote clients can never reach it');
  }
  if (!cfg.livekit.turnUrls.length) {
    problems.push('TURN_URLS is empty — calls will fail on strict-NAT mobile networks');
  }

  return problems;
}

/**
 * Enforce the guard: log + throw in production, warn only elsewhere.
 * Call from server.js before binding the port.
 */
export function assertProductionConfig() {
  const problems = validateProductionConfig();
  if (!problems.length) return;

  const header = `Configuration problems detected:\n  - ${problems.join('\n  - ')}`;
  if (env.isProd) {
    throw new Error(`Refusing to start in production. ${header}`);
  }
  // Non-prod: informational only.
  // eslint-disable-next-line no-console
  console.warn(`⚠️  ${header}\n(Not fatal outside production.)`);
}

export default env;
