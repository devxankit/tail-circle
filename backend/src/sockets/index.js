import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { redis, isRedisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { User } from '../modules/user/user.model.js';
import { SOCKET_EVENTS, rooms } from './events.js';

let io = null;

/** Socket.IO handshake auth — shared by the default and `/video` namespaces. */
async function sameAuth(socket, next) {
  try {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return next(new Error('Authentication token missing'));

    const payload = jwt.verify(token, env.jwt.accessSecret);
    const user = await User.findById(payload.sub).select('_id role isBlocked');
    if (!user) return next(new Error('User no longer exists'));
    if (user.isBlocked) return next(new Error('Account is blocked'));

    socket.data.user = { id: user.id, role: user.role };
    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}

/**
 * Mount Socket.IO on the shared http server.
 * Every connection must present a valid access token in the handshake
 * (`auth: { token }`); the socket joins its private `user:<id>` room so any
 * service can push to a user with `emitToUser(userId, event, payload)`.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || /\.vercel\.app$/.test(origin) || /localhost|127\.0\.0\.1/.test(origin) || (env.corsOrigin || []).includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  // Redis adapter → events reach sockets on every instance (horizontal scaling).
  if (isRedisReady()) attachRedisAdapter();
  else redis.once('ready', attachRedisAdapter);

  io.use(sameAuth);

  io.on('connection', (socket) => {
    const { id: userId, role } = socket.data.user;
    socket.join(rooms.user(userId));
    if (role === 'admin') socket.join(rooms.admins());
    // Clinics listen for `emergency:new` broadcasts (nearby-clinic fan-out).
    if (role === 'vendor') socket.join('clinics');

    socket.on(SOCKET_EVENTS.JOIN_ROOM, () => {
      // Room joins beyond the defaults are granted per-feature (e.g. a
      // conversation room after a participant check) — never blindly here.
    });

    // Client confirms LiveKit media is actually flowing — distinguishes a real
    // connection from a token that was issued but never used.
    socket.on('call:connected', ({ bookingId } = {}) => {
      if (bookingId) logger.info(`consult ${bookingId}: media connected for user ${userId}`);
    });

    socket.on('disconnect', () => {});
  });

  /**
   * Video consultation signalling (ring / accept / reject / end / overage) is
   * delivered on THIS namespace via `emitToUser()` — every open session of a
   * user is already in their private `user:<id>` room, so the vet's dashboard
   * and the pet parent's phone both ring with no extra subscription.
   *
   * There used to be a separate `/video` namespace relaying WebRTC
   * offers/answers/ICE peer-to-peer. It is gone: LiveKit is an SFU and does its
   * own signalling directly with `livekit-client`, so relaying here would fight
   * the SFU. It also could never have worked alongside `emitToUser`, which
   * targets this namespace only.
   */

  logger.info('✅ Socket.IO mounted');
  return io;
}

function attachRedisAdapter() {
  try {
    // Pub/sub needs dedicated connections; the adapter requires an offline
    // queue so its initial subscriptions never race the connection.
    const opts = { lazyConnect: false, enableOfflineQueue: true, keyPrefix: '' };
    const pub = redis.duplicate(opts);
    const sub = redis.duplicate(opts);
    io.adapter(createAdapter(pub, sub));
    logger.info('✅ Socket.IO Redis adapter attached');
  } catch (err) {
    logger.warn(`Socket.IO Redis adapter skipped: ${err.message}`);
  }
}

/** The live Server instance (null before initSocket / in scripts). */
export function getIO() {
  return io;
}

/** Push an event to every open session of one user. No-op if IO not mounted. */
export function emitToUser(userId, event, payload) {
  io?.to(rooms.user(String(userId))).emit(event, payload);
}

export function emitToVendor(vendorId, event, payload) {
  io?.to(rooms.vendor(String(vendorId))).emit(event, payload);
}

export function emitToAdmins(event, payload) {
  io?.to(rooms.admins()).emit(event, payload);
}
