import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

const read = () =>
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY).matches : false;

/**
 * Whether the OS is set to reduce motion.
 *
 * A store rather than a one-shot read, so a change to the system setting takes
 * effect without a reload.
 */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, read, () => false);
}

export default usePrefersReducedMotion;
