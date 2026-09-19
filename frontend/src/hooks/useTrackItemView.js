import { useEffect, useRef } from 'react';
import { trackItemView } from '../services/analytics';

/**
 * Report that a customer opened a specific service, product or listing, and
 * how long they looked at it.
 *
 * Time spent is the useful half. A three-second glance and a two-minute read
 * are very different signals about the same listing, and the "viewed but never
 * booked" report is only actionable when it can distinguish them.
 *
 * Fires on UNMOUNT, once the dwell time is known. Guarded so a screen that
 * re-renders while its data loads — the normal case, where `name` arrives a
 * moment after `id` — still reports exactly one view.
 *
 * Does nothing until the visitor has accepted analytics cookies.
 */
export function useTrackItemView({ refType, refId, refName, category }) {
  const openedAt = useRef(Date.now());
  // Held in a ref so the effect below can stay keyed on `refId` alone: the
  // name usually arrives on a later render, and depending on it would end the
  // view early and report a second one.
  const latest = useRef({ refType, refId, refName, category });
  latest.current = { refType, refId, refName, category };

  useEffect(() => {
    if (!refId) return undefined;
    openedAt.current = Date.now();

    return () => {
      const item = latest.current;
      if (!item.refId) return;
      trackItemView({ ...item, durationMs: Date.now() - openedAt.current });
    };
  }, [refId]);
}

export default useTrackItemView;
