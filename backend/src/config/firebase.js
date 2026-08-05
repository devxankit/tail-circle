import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging as fbMessaging } from 'firebase-admin/messaging';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * Single Firebase Admin SDK init — used only for FCM push notifications now
 * (chat runs on Socket.IO). Requires the service-account JSON (Firebase console
 * → Project settings → Service accounts → Generate new private key) saved at
 * FIREBASE_SERVICE_ACCOUNT_PATH — never committed.
 *
 * Without it the server still boots: push reports itself unavailable instead
 * of crashing.
 */
let app = null;

export function initFirebase() {
  if (app) return app;

  const saPath = path.resolve(process.cwd(), env.firebase.serviceAccountPath);
  if (!fs.existsSync(saPath)) {
    logger.warn(
      `Firebase service account not found at ${saPath} — ` +
        'push (FCM) is disabled until it is added'
    );
    return null;
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: env.firebase.projectId || serviceAccount.project_id,
    });
    logger.info('✅ Firebase Admin SDK initialized');
    return app;
  } catch (err) {
    logger.error(`Firebase init failed: ${err.message}`);
    return null;
  }
}

export function isFirebaseReady() {
  return app !== null;
}

/** Cloud Messaging handle — null when Firebase is not configured. */
export function getMessaging() {
  return app ? fbMessaging(app) : null;
}
