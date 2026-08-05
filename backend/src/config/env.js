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
   * TURN/STUN — relay servers for video consults.
   *
   * Video media is direct browser-to-browser WebRTC (P2P); this is just the
   * relay fallback for strict-NAT networks (most Indian mobile carriers). The
   * server's only involvement is minting short-lived TURN credentials — see
   * services/webrtcSignal.service.js. The signalling exchange itself (offer /
   * answer / ICE candidates) rides on Socket.IO, not a dedicated media server.
   */
  turn: {
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

  // ── TURN/STUN ──
  if (!cfg.turn.turnUrls.length) {
    problems.push('TURN_URLS is empty — calls will fail on strict-NAT mobile networks');
  }
  if (cfg.turn.turnUrls.length && !cfg.turn.turnSecret) {
    problems.push('TURN_URLS is set but TURN_SECRET is empty — TURN credentials cannot be minted');
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
