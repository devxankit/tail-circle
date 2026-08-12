import { useSyncExternalStore } from 'react';
import { isOnline, subscribeConnectivity } from '../services/offline';

/**
 * Whether the app can currently reach its backend.
 *
 * Backed by services/offline.js, so it accounts for a dead connection that
 * `navigator.onLine` still reports as online.
 */
export function useOnlineStatus() {
  return useSyncExternalStore(subscribeConnectivity, isOnline, () => true);
}

export default useOnlineStatus;
