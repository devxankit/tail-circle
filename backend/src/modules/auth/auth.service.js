import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { redis, isRedisReady } from '../../config/redis.js';
import { ApiError } from '../../utils/ApiError.js';
import { logger } from '../../utils/logger.js';
import { normalizePhone } from '../../utils/phone.js';
import { sendOtpSms } from '../../services/sms.service.js';
import { User } from '../user/user.model.js';
import { Otp } from './otp.model.js';
import { RefreshToken } from './refreshToken.model.js';

function generateNumericCode(length) {
  const max = 10 ** length;
  return crypto.randomInt(0, max).toString().padStart(length, '0');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Sign an access+refresh pair and persist the refresh token's hash. */
export async function issueTokens(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });

  const { exp } = jwt.decode(refreshToken);
  await RefreshToken.create({
    userId: user.id,
    tokenHash: hashToken(refreshToken),
    expiresAt: new Date(exp * 1000),
  });

  return { accessToken, refreshToken };
}

/**
 * Per-phone abuse guard on top of the IP rate limiter. Both limits are
 * configurable via env: OTP_COOLDOWN_SECONDS (gap between requests) and
 * OTP_MAX_PER_HOUR (requests allowed per rolling hour). Redis-backed; skipped
 * silently if Redis is down (IP limiter still applies).
 */
async function enforceOtpCooldown(phone) {
  if (!isRedisReady()) return;
  try {
    const cooldownKey = `otp:cooldown:${phone}`;
    const hourlyKey = `otp:hourly:${phone}`;
    const { cooldownSeconds, maxPerHour } = env.otp;

    if (await redis.get(cooldownKey)) {
      throw ApiError.tooMany(
        `Please wait ${cooldownSeconds} seconds before requesting another OTP`
      );
    }
    const hourly = await redis.incr(hourlyKey);
    if (hourly === 1) await redis.expire(hourlyKey, 3600);
    if (hourly > maxPerHour) throw ApiError.tooMany('OTP limit reached, try again in an hour');

    await redis.set(cooldownKey, '1', 'EX', cooldownSeconds);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    logger.warn(`OTP cooldown check skipped: ${err.message}`);
  }
}

/**
 * Create and send an OTP for a phone number via SMS India Hub.
 * In development (SMS_INDIA_ENABLED=false) the code is logged instead.
 */
export async function requestOtp(rawPhone) {
  const phone = normalizePhone(rawPhone);
  await enforceOtpCooldown(phone);

  const code = generateNumericCode(env.otp.length);
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + env.otp.expiresMinutes * 60 * 1000);

  // Invalidate previous unconsumed codes for this phone.
  await Otp.deleteMany({ phone, consumed: false });
  await Otp.create({ phone, codeHash, expiresAt });

  await sendOtpSms(phone, code, env.otp.expiresMinutes);
  // Only print the code to the terminal when SMS delivery is OFF (dev/no gateway).
  // When SMS is enabled the code is delivered to the phone and never logged.
  if (!env.sms.enabled) logger.info(`OTP for ${phone}: ${code}`);

  return { expiresInMinutes: env.otp.expiresMinutes };
}

/**
 * Verify an OTP; on success create the user if new and issue tokens.
 */
export async function verifyOtp(rawPhone, code) {
  const phone = normalizePhone(rawPhone);
  const otp = await Otp.findOne({ phone, consumed: false }).sort({ createdAt: -1 });
  if (!otp) throw ApiError.badRequest('No OTP requested for this number');
  if (otp.expiresAt < new Date()) throw ApiError.badRequest('OTP has expired');
  if (otp.attempts >= 5) throw ApiError.tooMany('Too many incorrect attempts');

  const matches = await bcrypt.compare(code, otp.codeHash);
  if (!matches) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest('Incorrect OTP');
  }

  otp.consumed = true;
  await otp.save();

  let user = await User.findOne({ phone });
  const isNewUser = !user;
  if (!user) {
    user = await User.create({ phone, isPhoneVerified: true });
  } else if (!user.isPhoneVerified) {
    user.isPhoneVerified = true;
  }
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user);
  return { user, tokens, isNewUser };
}

/**
 * Exchange a valid refresh token for a fresh pair (rotation). Reusing an
 * already-rotated token is treated as theft: the user's entire token family
 * is revoked and they must log in again.
 */
export async function refreshTokens(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const stored = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
  if (!stored) throw ApiError.unauthorized('Invalid or expired refresh token');
  if (stored.revokedAt) {
    await RefreshToken.updateMany(
      { userId: stored.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    logger.warn(`Refresh token reuse detected for user ${stored.userId} — all sessions revoked`);
    throw ApiError.unauthorized('Session expired, please log in again');
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');

  const tokens = await issueTokens(user);
  stored.revokedAt = new Date();
  stored.replacedByHash = hashToken(tokens.refreshToken);
  await stored.save();

  return { user, tokens };
}

/** Revoke a refresh token (logout). Silently succeeds for unknown tokens. */
export async function revokeRefreshToken(refreshToken) {
  if (!refreshToken) return;
  await RefreshToken.updateOne(
    { tokenHash: hashToken(refreshToken), revokedAt: null },
    { $set: { revokedAt: new Date() } }
  );
}
