import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getVendorProfiles } from '../modules/vendor/vendor.service.js';
import { vendorTypeLabel } from '../modules/vendor/vendorTypeLabels.js';

/**
 * Shared vendor guards.
 *
 * These used to be defined privately inside `vendor.routes.js`, which meant a
 * new vendor router (grooming) shipped with `authenticate` only — leaving its
 * endpoints open to every logged-in account, pet parents included. Keeping the
 * guards here makes the correct pairing available to every vendor router.
 *
 *   router.use(authenticate, authorize('vendor'));
 *   const grooming = [withVendor, requireType('grooming')];
 *
 * A vendor may run several business lines at once, so every request has to
 * resolve *which* one it is acting as. Two things decide that:
 *
 *   - `requireType('grooming')` on a line-specific router — the route itself
 *     says which business it belongs to, so it selects that profile.
 *   - the `X-Vendor-Type` header on shared routes (profile, payouts, support),
 *     set by the frontend from whichever panel the vendor currently has open.
 *
 * With neither, the primary (oldest) line is used, which is what a single-line
 * vendor has always got.
 */

/** The business line this request is acting as, or null. */
export function requestedVendorType(req) {
  return req.get?.('X-Vendor-Type') || req.headers?.['x-vendor-type'] || req.query?.vendorType || null;
}

/**
 * Attaches every profile as `req.vendorProfiles` and the active one as
 * `req.vendor`. Refuses a line that is not approved yet.
 */
export const withVendor = asyncHandler(async (req, _res, next) => {
  const profiles = await loadProfiles(req);
  const active = selectProfile(profiles, requestedVendorType(req));
  if (active.approvalStatus !== 'approved') throw ApiError.forbidden('Vendor account not approved');
  req.vendor = active;
  next();
});

/**
 * Like `withVendor` but does not require approval.
 *
 * Needed by the routes a pending vendor must still reach — their own profile,
 * the business-lines list, KYC document uploads. Gating those on approval is
 * what would leave a vendor unable to supply the very documents the approval
 * is waiting on.
 */
export const withAnyVendor = asyncHandler(async (req, _res, next) => {
  const profiles = await loadProfiles(req);
  req.vendor = selectProfile(profiles, requestedVendorType(req));
  next();
});

/**
 * Restrict a route to one business line, and select that line's profile.
 *
 * This is a selector, not just an assertion: a vendor who runs both grooming
 * and daycare reaches the grooming router as their grooming business, with
 * that line's commission, approval state and storefront toggle — regardless of
 * which panel their browser last had open. A shop vendor still never reaches a
 * clinic or grooming endpoint.
 */
export const requireType = (...types) =>
  asyncHandler(async (req, _res, next) => {
    const profiles = await loadProfiles(req);
    const match = profiles.find((p) => types.includes(p.vendorType));
    if (!match) {
      throw ApiError.forbidden('Not available for this vendor type');
    }
    if (match.approvalStatus !== 'approved') {
      throw ApiError.forbidden(`Your ${vendorTypeLabel(match.vendorType)} business is not approved yet`);
    }
    req.vendor = match;
    next();
  });

/** Loads (and memoises) the caller's business lines for this request. */
async function loadProfiles(req) {
  if (!req.vendorProfiles) {
    const profiles = await getVendorProfiles(req.user.id);
    if (!profiles.length) throw ApiError.notFound('Vendor profile not found');
    req.vendorProfiles = profiles;
  }
  return req.vendorProfiles;
}

/** The requested line if the vendor owns it, else the primary (oldest) one. */
function selectProfile(profiles, vendorType) {
  if (vendorType) {
    const match = profiles.find((p) => p.vendorType === vendorType);
    if (match) return match;
  }
  return profiles[0];
}

export default { withVendor, withAnyVendor, requireType, requestedVendorType };
