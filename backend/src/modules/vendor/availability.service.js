import { User } from '../user/user.model.js';
import { ApiError } from '../../utils/ApiError.js';
import { getOrSet, invalidate } from '../../services/cache.service.js';

/**
 * A vendor's own "I am open" switch.
 *
 * Distinct from `Provider.active` and `approvalStatus`, which are the
 * platform's controls: an admin deactivating a fraudulent salon and a groomer
 * closing for a family wedding are not the same event, and collapsing them into
 * one flag means a vendor could switch their own suspension off.
 *
 * Going offline hides the business from discovery and refuses new bookings and
 * enquiries. It changes nothing that already exists — confirmed bookings,
 * conversations, payouts and history all stay exactly as they are, so coming
 * back online is simply the flag flipping again.
 */

/*
 * A trailing `*` is load-bearing.
 *
 * `invalidate()` reads a `cache_set:<namespace>` tracking set first, which
 * `getOrSet` never populates, then falls back to SCAN -- and that fallback
 * appends `:*` to any pattern without a wildcard. `vendor:offline_ids:*` can
 * never match the key `vendor:offline_ids`, so invalidation silently did
 * nothing and a toggle took the full TTL to be noticed.
 */
const OFFLINE_CACHE_KEY = 'vendor:offline_ids';
const OFFLINE_CACHE_PATTERN = 'vendor:offline_ids*';

/*
 * Every public listing that filters on availability also caches its whole
 * response for 2-5 minutes. Clearing only the offline-id set would leave a
 * closed business sitting in those cached pages for the rest of the window --
 * which is precisely the promise the switch makes and has to keep.
 *
 * `/providers` is absent deliberately: it is not response-cached, so it
 * reflects the change on the next request with nothing to clear.
 */
const LISTING_CACHE_NAMESPACES = ['doctors', 'events', 'shop', 'meals', 'adoption'];

export async function getAvailability(userId) {
  const user = await User.findById(userId).select('vendorOnline vendorOfflineAt').lean();
  if (!user) throw ApiError.notFound('Account not found');
  return {
    // Absent on rows written before this existed: an account that never chose
    // is open, never closed.
    online: user.vendorOnline !== false,
    offlineSince: user.vendorOnline === false ? user.vendorOfflineAt || null : null,
  };
}

export async function setAvailability(userId, online) {
  const next = Boolean(online);
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { vendorOnline: next, vendorOfflineAt: next ? null : new Date() } },
    { new: true }
  ).select('vendorOnline vendorOfflineAt');
  if (!user) throw ApiError.notFound('Account not found');

  /*
   * Drop the offline set and every cached listing built from it, in the same
   * breath as the write. Best-effort: a cache that refuses to clear should
   * delay the change, never fail the vendor's request to close.
   */
  await Promise.all(
    [OFFLINE_CACHE_PATTERN, ...LISTING_CACHE_NAMESPACES].map((p) =>
      invalidate(p).catch(() => {})
    )
  );

  return {
    online: user.vendorOnline !== false,
    offlineSince: user.vendorOnline === false ? user.vendorOfflineAt || null : null,
  };
}

/**
 * Vendor accounts currently switched off, for excluding from public listings.
 *
 * Cached because it is read on every browse of every vertical and changes only
 * when somebody flips their switch — which invalidates it immediately, so the
 * TTL is a safety net rather than the mechanism.
 *
 * Returns `[]` if the lookup fails: a cache or database hiccup should make the
 * platform look too full rather than empty.
 */
export async function offlineVendorIds() {
  try {
    const ids = await getOrSet(OFFLINE_CACHE_KEY, 60, async () => {
      const rows = await User.find({ role: 'vendor', vendorOnline: false }).distinct('_id');
      return rows.map(String);
    });
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

/**
 * A `$nin` clause for a collection's vendor-owner field, or nothing when every
 * vendor is open — so the common case adds no condition at all.
 *
 * Rows with no owner (platform-listed products, seeded catalogue entries) hold
 * `null`, which `$nin` leaves alone. They are the platform's, not a vendor's,
 * and must stay visible.
 */
export async function excludeOfflineVendors(ownerField) {
  const ids = await offlineVendorIds();
  return ids.length ? { [ownerField]: { $nin: ids } } : {};
}

/** True when this vendor is taking work right now. */
export async function isVendorOnline(vendorUserId) {
  if (!vendorUserId) return true; // platform-owned, never closed
  const ids = await offlineVendorIds();
  return !ids.includes(String(vendorUserId));
}

/**
 * Refuse a booking or enquiry aimed at a closed business.
 *
 * The listing already hides them, so reaching here means a stale page, a
 * deep link, or a request made in the seconds after they closed.
 */
export async function assertVendorOnline(vendorUserId, label = 'This business') {
  if (await isVendorOnline(vendorUserId)) return;
  throw ApiError.badRequest(`${label} is not accepting bookings right now. Please try again later.`);
}

export default { getAvailability, setAvailability, offlineVendorIds, excludeOfflineVendors };
