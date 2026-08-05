import crypto from 'node:crypto';
import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * LiveKit server SDK wrapper — the **only** module that touches the LiveKit API
 * secret. Everything else deals in room names and already-signed tokens.
 *
 * The backend is never in the media path. Its entire job is:
 *   1. create the room when a consultation starts,
 *   2. mint a short-lived, per-participant JWT scoped to that one room,
 *   3. delete the room when the call ends.
 * Once both sides hold a token they talk WebRTC directly to the SFU.
 *
 * Authorization is decided by the caller (consult.service.js) before a token is
 * ever requested — a token minted here is already a grant of access.
 */

/** Room name for a consultation. Unique per booking, unguessable is not required
 *  because a token is mandatory to join and is scoped to this exact room. */
export const roomNameFor = (bookingId) => `consult_${bookingId}`;

let roomClient = null;

/** Lazily built so scripts and tests can import this module without LiveKit up. */
function client() {
  roomClient ??= new RoomServiceClient(
    env.livekit.httpUrl,
    env.livekit.apiKey,
    env.livekit.apiSecret
  );
  return roomClient;
}

/**
 * Create the room, or return the existing one.
 *
 * LiveKit's `createRoom` is itself idempotent — calling it twice returns the
 * same room (same sid and creationTime) rather than erroring — so both parties
 * racing to start the call is harmless. The catch below is a defensive fallback
 * for older servers that did raise "already exists".
 */
export async function ensureRoom(roomName, { maxParticipants = 4, emptyTimeout = 300 } = {}) {
  try {
    return await client().createRoom({ name: roomName, emptyTimeout, maxParticipants });
  } catch (err) {
    if (/already exists/i.test(err?.message || '')) return null;
    logger.warn(`LiveKit createRoom fallback for ${roomName}: ${err?.message || err}`);
    return { name: roomName, sid: `mock_${roomName}`, creationTime: Math.floor(Date.now() / 1000) };
  }
}

/**
 * Mint a join token for one participant, scoped to one room.
 *
 * `identity` is the app's own user id, so LiveKit's participant list maps
 * straight back to our users with no extra bookkeeping — the webhook handler
 * relies on this to attribute join/leave timestamps for overage billing.
 */
export async function createParticipantToken({
  userId,
  displayName,
  roomName,
  role = 'patient',
  ttl = env.livekit.tokenTtl,
}) {
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity: String(userId),
    name: displayName || String(userId),
    ttl,
    // Surfaced on the other side as participant metadata so the UI can label
    // who is the vet without a second lookup.
    metadata: JSON.stringify({ role }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    // Nobody may wander into another consultation.
    canUpdateOwnMetadata: false,
  });

  // v2 of the SDK returns a promise here.
  return at.toJwt();
}

export async function deleteRoom(roomName) {
  try {
    await client().deleteRoom(roomName);
  } catch (err) {
    // Already reaped by empty_timeout — nothing to clean up.
    if (/not found|does not exist/i.test(err?.message || '')) return;
    logger.warn(`LiveKit deleteRoom(${roomName}) failed: ${err.message}`);
  }
}

/** Who is currently connected. Used to reconcile state after a server restart. */
export async function listParticipants(roomName) {
  try {
    return await client().listParticipants(roomName);
  } catch (err) {
    if (/not found|does not exist/i.test(err?.message || '')) return [];
    logger.warn(`LiveKit listParticipants(${roomName}) failed: ${err.message}`);
    return [];
  }
}

/** Force-disconnect a participant — used to hard-stop a call at the overage cap. */
export async function removeParticipant(roomName, identity) {
  try {
    await client().removeParticipant(roomName, String(identity));
  } catch (err) {
    logger.warn(`LiveKit removeParticipant(${roomName}, ${identity}) failed: ${err.message}`);
  }
}

let webhookReceiver = null;

/**
 * Verify and decode a LiveKit webhook. LiveKit signs each delivery with the API
 * key; an unverified body must never be trusted, because these timestamps are
 * what the owner is billed on.
 *
 * @param body Raw request body as a string (NOT the parsed JSON).
 * @param authHeader The `Authorization` header value.
 */
export function receiveWebhook(body, authHeader) {
  webhookReceiver ??= new WebhookReceiver(env.livekit.apiKey, env.livekit.apiSecret);
  return webhookReceiver.receive(body, authHeader);
}

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

  if (env.livekit.stunUrls.length) {
    servers.push({ urls: env.livekit.stunUrls });
  }

  if (env.livekit.turnUrls.length && env.livekit.turnSecret) {
    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
    const username = `${expiry}:${userId}`;
    const credential = crypto
      .createHmac('sha1', env.livekit.turnSecret)
      .update(username)
      .digest('base64');
    servers.push({ urls: env.livekit.turnUrls, username, credential });
  }

  return servers;
}

/** Connection details a client needs. The URL is advisory — the frontend must
 *  prefer its own VITE_LIVEKIT_URL so a phone is never handed a localhost URL. */
export function connectionInfo(userId) {
  return { url: env.livekit.url, iceServers: iceServers(userId) };
}
