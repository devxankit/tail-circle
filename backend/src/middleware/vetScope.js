import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Doctor } from '../modules/provider/doctor.model.js';

/**
 * Per-vet scoping for the clinic dashboard.
 *
 * Two kinds of account reach these routes:
 *
 *   • **Clinic owner** — the vendor User that owns the clinic. Sees every vet in
 *     the clinic and everything they do.
 *   • **Staff vet** — a vet with their own login (`Doctor.userId`). Sees only
 *     their own appointments, records and earnings.
 *
 * A solo practitioner is both: their User is the clinic tenant *and* the
 * `Doctor.userId`, so they get owner-level scope over a single doctor.
 *
 * Everything downstream reads `req.vetScope` rather than assuming the caller is
 * the clinic — which is what makes it safe for a clinic to have several vets.
 */

/**
 * @returns {{
 *   clinicVendorId: string,   // tenant key — scopes patients, labs, records
 *   doctorIds: string[],      // doctors this caller may act for
 *   doctorId: string|null,    // the single doctor, when unambiguous
 *   isOwner: boolean,         // clinic owner vs staff vet
 * }}
 */
export async function resolveVetScope(user) {
  const userId = String(user.id ?? user._id);

  // Is this user a vet in their own right?
  const own = await Doctor.findOne({ userId }).select('_id clinicVendorId');

  // Which clinic does this user own, if any?
  const owned = await Doctor.find({ clinicVendorId: userId }).select('_id');

  if (owned.length) {
    // Clinic owner (this includes the solo-vet case).
    return {
      clinicVendorId: userId,
      doctorIds: owned.map((d) => String(d._id)),
      doctorId: owned.length === 1 ? String(owned[0]._id) : null,
      isOwner: true,
    };
  }

  if (own) {
    // Staff vet — scoped to themselves inside their clinic's tenant.
    return {
      clinicVendorId: String(own.clinicVendorId || userId),
      doctorIds: [String(own._id)],
      doctorId: String(own._id),
      isOwner: false,
    };
  }

  throw ApiError.badRequest('No vet profile is linked to this account yet');
}

/** Express middleware — attaches `req.vetScope`. Use after `authenticate`. */
export const withVetScope = asyncHandler(async (req, _res, next) => {
  req.vetScope = await resolveVetScope(req.user);
  next();
});

/**
 * Narrow a scope to one doctor, refusing ids the caller may not act for.
 * Used wherever a route accepts `?doctorId=`.
 */
export function requireDoctor(scope, doctorId) {
  if (!doctorId) {
    if (scope.doctorId) return scope.doctorId;
    throw ApiError.badRequest('doctorId is required for a clinic with multiple vets');
  }
  if (!scope.doctorIds.includes(String(doctorId))) {
    throw ApiError.forbidden('That vet is not part of your clinic');
  }
  return String(doctorId);
}

export default withVetScope;
