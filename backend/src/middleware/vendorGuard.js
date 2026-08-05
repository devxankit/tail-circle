import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getVendorProfile } from '../modules/vendor/vendor.service.js';

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
 */

/** Attaches `req.vendor`; refuses vendors who are not approved yet. */
export const withVendor = asyncHandler(async (req, _res, next) => {
  const profile = await getVendorProfile(req.user.id);
  if (profile.approvalStatus !== 'approved') throw ApiError.forbidden('Vendor account not approved');
  req.vendor = profile;
  next();
});

/**
 * Restrict a route to one vendor type. Use after `withVendor`.
 * A shop vendor must never reach a clinic or grooming endpoint.
 */
export const requireType = (...types) =>
  asyncHandler(async (req, _res, next) => {
    if (!types.includes(req.vendor.vendorType)) {
      throw ApiError.forbidden('Not available for this vendor type');
    }
    next();
  });

export default { withVendor, requireType };
