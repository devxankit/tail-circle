import { getMessaging, isFirebaseReady } from '../config/firebase.js';
import { DeviceToken } from '../modules/notification/deviceToken.model.js';
import { logger } from '../utils/logger.js';

/**
 * Firebase Cloud Messaging push. Fire-and-forget by design: a push failure
 * must never fail the business operation that triggered it.
 */

/** Save/refresh a device token for a user (called from the notifications API). */
export async function registerDeviceToken(userId, token, platform = 'web') {
  await DeviceToken.findOneAndUpdate(
    { token },
    { userId, platform, lastSeenAt: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

export async function unregisterDeviceToken(token) {
  await DeviceToken.deleteOne({ token });
}

/**
 * Push to every registered device of a user.
 * payload: { title, body, data? } — data values must be strings (FCM rule).
 */
export async function sendToUser(userId, { title, body, data = {} }) {
  if (!isFirebaseReady()) return { sent: 0, skipped: true };

  const tokens = await DeviceToken.find({ userId }).distinct('token');
  if (!tokens.length) return { sent: 0 };

  try {
    const res = await getMessaging().sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    });

    // Prune tokens FCM says are dead so lists stay clean.
    const deadTokens = res.responses
      .map((r, i) => (!r.success && isDeadToken(r.error) ? tokens[i] : null))
      .filter(Boolean);
    if (deadTokens.length) await DeviceToken.deleteMany({ token: { $in: deadTokens } });

    return { sent: res.successCount };
  } catch (err) {
    logger.warn(`FCM send failed for user ${userId}: ${err.message}`);
    return { sent: 0, error: err.message };
  }
}

function isDeadToken(error) {
  return [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
  ].includes(error?.code);
}
