import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Media transport for video consults is direct, browser-to-browser WebRTC
 * (P2P) — every consult is exactly one vet and one pet parent, so there is
 * no fan-out that would justify an SFU. Signalling (the offer/answer/ICE
 * exchange) rides on the app's existing authenticated Socket.IO connection;
 * see `sockets/index.js` for the relay and `consult.service.js` for the
 * join/leave bookkeeping that used to come from LiveKit's webhooks.
 *
 * This module's only remaining job is handing out STUN/TURN relay servers so
 * calls survive strict-NAT mobile networks — there is no room/token concept
 * left to manage server-side.
 */

/** Socket.IO room name for a consultation's signalling. Unique per booking. */
export const roomNameFor = (bookingId) => `consult_${bookingId}`;

/**
 * Time-limited TURN credentials (RFC 5766 §10.2 / coturn `use-auth-secret`).
 *
 * username = <expiry unix ts>:<userId>
 * password = base64(HMAC-SHA1(secret, username))
 *
 * Derived per request so no long-lived TURN account exists to leak. Returns an
 * empty list when TURN is not configured — fine for local dev, refused by the
 * production startup guard.
 */
export function iceServers(userId, ttlSeconds = 6 * 3600) {
  const servers = [];

  if (env.turn.stunUrls.length) {
    servers.push({ urls: env.turn.stunUrls });
  }

  if (env.turn.turnUrls.length && env.turn.turnSecret) {
    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${expiry}:${userId}`;
    const credential = crypto
      .createHmac('sha1', env.turn.turnSecret)
      .update(username)
      .digest('base64');
    servers.push({ urls: env.turn.turnUrls, username, credential });
  }

  return servers;
}

/** Connection details a client needs to set up its RTCPeerConnection. */
export function connectionInfo(userId) {
  return { iceServers: iceServers(userId) };
}
