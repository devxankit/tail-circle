import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { redis, isRedisReady } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { User } from '../modules/user/user.model.js';
import { SOCKET_EVENTS, rooms } from './events.js';
import { roomNameFor } from '../services/webrtcSignal.service.js';
import { authorizeCall, markParticipantJoined, markParticipantLeft } from '../modules/consult/consult.service.js';

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

    // Which call rooms (booking ids) this socket has joined — used to settle
    // join/leave timing on disconnect without the client having to say so.
    const activeCalls = new Set();

    /**
     * A participant's browser is ready to exchange WebRTC signalling for a
     * consultation. Re-checks authorization (the REST start/join call already
     * did this to get here, but a socket could otherwise be pointed at any
     * booking id) before letting it into the room, then records the join as
     * the authoritative timing event overage billing is computed from — see
     * `consult.service.js::markParticipantJoined`.
     */
    socket.on('call:join-room', async ({ bookingId } = {}, ack) => {
      if (!bookingId) return ack?.({ ok: false, error: 'bookingId required' });
      try {
        await authorizeCall(socket.data.user, bookingId, { enforceWindow: false, requireJoinable: false });
      } catch (err) {
        // Deliberately logged: a rejected join here is exactly why a call
        // fails to connect with no server-visible trace otherwise.
        logger.warn(`call:join-room rejected — user ${userId}, booking ${bookingId} — ${err.message}`);
        return ack?.({ ok: false, error: err.message || 'Not authorized for this call' });
      }

      const room = roomNameFor(bookingId);
      // Must be read BEFORE this socket joins — otherwise it would always
      // see itself and report a peer that isn't really there yet. This is
      // what tells the offerer (the vet — see webrtcCall.js) whether the
      // answerer is already waiting, since `webrtc:peer-joined` below only
      // reaches sockets already in the room, never the one joining now.
      const peerPresent = (io.sockets.adapter.rooms.get(room)?.size || 0) > 0;

      socket.join(room);
      activeCalls.add(bookingId);
      await markParticipantJoined(bookingId, userId);
      logger.info(`call:join-room ok — user ${userId}, booking ${bookingId}, peerPresent=${peerPresent}`);

      socket.to(room).emit('webrtc:peer-joined', { bookingId, userId });
      return ack?.({ ok: true, peerPresent });
    });

    const leaveCallRoom = async (bookingId) => {
      if (!activeCalls.has(bookingId)) return;
      activeCalls.delete(bookingId);
      socket.leave(roomNameFor(bookingId));
      await markParticipantLeft(bookingId, userId);
      socket.to(roomNameFor(bookingId)).emit('webrtc:peer-left', { bookingId, userId });
    };

    socket.on('call:leave-room', ({ bookingId } = {}) => {
      if (bookingId) leaveCallRoom(bookingId).catch((err) => logger.warn(`call:leave-room failed: ${err.message}`));
    });

    // Pure relay — the server never interprets SDP/ICE payloads, it just
    // forwards them to the other socket already sitting in this call's room.
    // `socket.rooms` only contains rooms this socket actually joined via
    // call:join-room above, so this can't be used to reach an arbitrary room.
    const relay = (event) => (payload = {}) => {
      const { bookingId } = payload;
      if (!bookingId || !socket.rooms.has(roomNameFor(bookingId))) return;
      socket.to(roomNameFor(bookingId)).emit(event, { ...payload, from: userId });
    };
    socket.on('webrtc:offer', relay('webrtc:offer'));
    socket.on('webrtc:answer', relay('webrtc:answer'));
    socket.on('webrtc:ice-candidate', relay('webrtc:ice-candidate'));

    /**
     * Diagnostic-only telemetry from `RTCPeerConnection.connectionState` —
     * the media path itself is direct browser-to-browser and invisible to
     * this server otherwise, so this is the only way a stuck/failed call is
     * ever debuggable from server logs instead of guesswork. `local`/`remote`
     * on a 'connected' report say whether TURN relayed the media ('relay')
     * or a direct path was found ('host'/'srflx') — the thing to check when
     * diagnosing "connects but no video".
     */
    socket.on('call:media-state', ({ bookingId, state, local, remote, iceConnectionState, iceGatheringState } = {}) => {
      if (!bookingId || !state) return;
      logger.info(
        `call media — user ${userId}, booking ${bookingId}: ${state}` +
          (local || remote ? ` (local=${local || '?'}, remote=${remote || '?'})` : '') +
          (iceConnectionState ? ` [ice=${iceConnectionState}/${iceGatheringState}]` : '')
      );
    });

    socket.on('disconnect', () => {
      for (const bookingId of activeCalls) {
        leaveCallRoom(bookingId).catch((err) => logger.warn(`disconnect leaveCallRoom failed: ${err.message}`));
      }
    });
  });

  /**
   * Video consultation signalling (ring / accept / reject / end / overage,
   * AND now the WebRTC offer/answer/ICE exchange itself) is delivered on THIS
   * namespace via `emitToUser()` / the `call:*` and `webrtc:*` handlers above
   * — every open session of a user is already in their private `user:<id>`
   * room, so the vet's dashboard and the pet parent's phone both ring with no
   * extra subscription.
   *
   * Media used to run through a self-hosted LiveKit SFU, which did its own
   * signalling directly with `livekit-client`. It's gone: every consult is
   * strictly 1:1, so there's no fan-out to justify an SFU — the two browsers
   * now connect directly (P2P WebRTC) and this socket is their signalling
   * channel.
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
