import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackScreen, flush } from '../services/analytics';

/**
 * Records a `screen_view` for every route the customer opens, with the time
 * they actually spent on it.
 *
 * Timing is measured on LEAVING a screen, not on arrival: "how long did they
 * stay" is the question worth answering, and it is only knowable once they go.
 * That means the event for a screen fires when the next one opens, and the
 * final screen of a visit is flushed by the unload handler in analytics.js.
 *
 * Mounted once, high in the tree. Does nothing without consent — `trackScreen`
 * is a no-op until the visitor accepts.
 */

/**
 * Friendly names for the paths worth naming. Anything unmatched falls back to
 * a title-cased last path segment, so a new route still reports something
 * legible instead of vanishing from the report.
 */
const SCREEN_NAMES = [
  [/^\/app\/home/, 'Home'],
  [/^\/app\/grooming/, 'Grooming'],
  [/^\/app\/daycare/, 'Day Care'],
  [/^\/app\/doctors/, 'Vets & Doctors'],
  [/^\/app\/shop\/product/, 'Product Detail'],
  [/^\/app\/shop/, 'Shop'],
  [/^\/app\/meals/, 'Meals'],
  [/^\/app\/events/, 'Events'],
  [/^\/app\/adopt/, 'Adoption'],
  [/^\/app\/memorial/, 'Memorial'],
  [/^\/app\/community/, 'Community'],
  [/^\/app\/matches/, 'Matches'],
  [/^\/app\/chat/, 'Chat'],
  [/^\/app\/cart/, 'Cart'],
  [/^\/app\/checkout/, 'Checkout'],
  [/^\/app\/profile\/bookings/, 'My Bookings'],
  [/^\/app\/profile\/orders/, 'My Orders'],
  [/^\/app\/profile/, 'Profile'],
  [/^\/app\/wallet/, 'Wallet'],
  [/^\/app\/notifications/, 'Notifications'],
  [/^\/app\/search/, 'Search'],
];

function screenNameFor(pathname) {
  const hit = SCREEN_NAMES.find(([re]) => re.test(pathname));
  if (hit) return hit[1];
  const seg = pathname.split('/').filter(Boolean).pop() || 'App';
  return seg
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 40);
}

export function useActivityTracking() {
  const { pathname } = useLocation();
  const current = useRef({ path: pathname, at: Date.now() });

  useEffect(() => {
    const previous = current.current;

    // Emit the screen they just left, with its dwell time.
    if (previous.path && previous.path !== pathname) {
      trackScreen(previous.path, screenNameFor(previous.path), Date.now() - previous.at);
    }
    current.current = { path: pathname, at: Date.now() };
  }, [pathname]);

  // The last screen of a visit has no "next route" to close it out, so it is
  // emitted on unmount and pushed immediately rather than waiting on the timer.
  useEffect(() => {
    return () => {
      const { path, at } = current.current;
      if (path) trackScreen(path, screenNameFor(path), Date.now() - at);
      flush(true);
    };
  }, []);
}

export default useActivityTracking;
