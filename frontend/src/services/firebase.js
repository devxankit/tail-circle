import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

/**
 * Firebase web SDK — used only for FCM web push now (live chat runs on
 * Socket.IO, see services/socket.js + services/social.js). Message SENDS and
 * history always go through the backend API.
 */

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = initializeApp(firebaseConfig);

/**
 * Ask for notification permission and register this browser for push.
 * Send the returned token to the backend (device-token endpoint, Phase 8).
 */
export async function requestPushToken() {
  if (!(await isSupported())) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = getMessaging(firebaseApp);
  return getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
  });
}

/** Foreground push messages (background ones need a service worker — Phase 8). */
export async function onForegroundPush(handler) {
  if (!(await isSupported())) return () => {};
  return onMessage(getMessaging(firebaseApp), handler);
}
