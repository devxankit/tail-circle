import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../modules/user/user.model.js';

/*
 * How stale `lastSeenAt` may get before an authenticated request refreshes it.
 *
 * Socket presence only stamps that field when a user's last socket
 * disconnects, so anyone browsing over plain REST -- or whose socket never
 * connected -- read as permanently idle on the admin User Management screen.
 * Throttling the write keeps "last active" honest without turning every
 * request in a busy session into a database round trip.
 */
const SEEN_THROTTLE_MS = 5 * 60 * 1000;

/**
 * Require a valid access token. Attaches `req.user`.
 * Expects header: Authorization: Bearer <token>
 */
export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) throw ApiError.unauthorized('Authentication token missing');

  const payload = jwt.verify(token, env.jwt.accessSecret);
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.isBlocked) throw ApiError.forbidden('Account is blocked');

  // Fire and forget: presence is not worth delaying the response for, and a
  // failed heartbeat should never fail the request it rode in on.
  if (user.role === 'user') {
    const last = user.lastSeenAt ? new Date(user.lastSeenAt).getTime() : 0;
    if (Date.now() - last > SEEN_THROTTLE_MS) {
      const seenAt = new Date();
      user.lastSeenAt = seenAt;
      User.updateOne({ _id: user._id }, { lastSeenAt: seenAt }).exec().catch(() => {});
    }
  }

  req.user = user;
  next();
});

/**
 * Attach `req.user` when a valid token is present, and carry on when it is not.
 *
 * For endpoints a logged-OUT visitor must still reach, where knowing who they
 * are changes the result but is not required — activity tracking is the first:
 * a guest browsing the app produces events that matter, and they sign in
 * partway through the same visit.
 *
 * Never throws. A malformed, expired or revoked token is treated exactly like
 * no token at all, because the alternative is breaking an anonymous request
 * over a credential it never needed.
 */
export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(payload.sub);
    if (user && !user.isBlocked) req.user = user;
  } catch {
    /* Anonymous is a valid outcome here. */
  }
  return next();
});

/**
 * Restrict a route to specific roles. Use after `authenticate`.
 * Usage: router.get('/', authenticate, authorize('admin'), handler)
 */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission for this action'));
    }
    return next();
  };
