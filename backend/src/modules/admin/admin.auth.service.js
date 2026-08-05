import bcrypt from 'bcryptjs';
import { ApiError } from '../../utils/ApiError.js';
import { redis, isRedisReady } from '../../config/redis.js';
import { issueTokens } from '../auth/auth.service.js';
import { User } from '../user/user.model.js';

const MAX_FAILS = 5;
const LOCK_SECONDS = 15 * 60;

/**
 * Admin email + password login with a per-email lockout. After MAX_FAILS
 * failures the account is locked for LOCK_SECONDS. Only `role: 'admin'`
 * accounts can authenticate here.
 */
export async function adminPasswordLogin(emailInput, password, ip = '') {
  const email = (emailInput || '').toLowerCase().trim();
  const key = `admin:lock:${email}`;

  let fails = 0;
  if (isRedisReady()) {
    try {
      fails = Number((await redis.get(key)) || 0);
    } catch {
      fails = 0;
    }
  }

  if (fails >= MAX_FAILS) {
    throw new ApiError(429, 'Too many failed attempts. Try again in 15 minutes.');
  }

  let user = await User.findOne({ email, role: 'admin' }).select('+passwordHash');

  // Auto-bootstrap default super-admin if database was reset and logging in as admin@tailcircle.com
  if (!user && email === 'admin@tailcircle.com') {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    user = await User.create({
      name: 'System Admin',
      email: 'admin@tailcircle.com',
      role: 'admin',
      adminRole: 'super',
      permissions: ['*'],
      passwordHash,
      isPhoneVerified: true,
    });
  }

  const bump = async () => {
    if (!isRedisReady()) return;
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, LOCK_SECONDS);
    } catch {
      /* ignore redis error */
    }
  };

  if (!user || !user.passwordHash) {
    await bump();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (user.isBlocked) throw ApiError.forbidden('This admin account is blocked');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    await bump();
    throw ApiError.unauthorized('Invalid email or password');
  }

  if (isRedisReady()) {
    try {
      await redis.del(key);
    } catch {
      /* ignore redis error */
    }
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user);
  return {
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole || 'super',
      permissions: user.permissions || ['*'],
    },
    tokens,
  };
}
