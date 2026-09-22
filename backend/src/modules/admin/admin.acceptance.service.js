import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { notify } from '../../services/notify.js';
import { VendorProfile } from '../vendor/vendor.models.js';
import { Provider } from '../provider/provider.model.js';
import { Doctor } from '../provider/doctor.model.js';
import { writeAudit } from './admin.service.js';

/**
 * Turn manual booking acceptance on or off for one partner business line.
 *
 * The capability existed but the switch did not: `requiresAcceptance` was a
 * field on the Provider or Doctor record with no interface, so enabling it
 * meant editing MongoDB by hand. Off by default, which is why every existing
 * partner keeps auto-confirming exactly as before.
 *
 * Only grooming, daycare and clinics support it. Events and memorials are sold
 * against published capacity — there is no "accept" step to wait on, and
 * offering the toggle there would park bookings in a state their panels never
 * surface.
 */

const SUPPORTED = {
  grooming: { model: 'provider', providerType: 'grooming' },
  daycare: { model: 'provider', providerType: 'daycare' },
  clinic: { model: 'doctor' },
};

async function loadProfile(profileId) {
  if (!mongoose.isValidObjectId(profileId)) throw ApiError.badRequest('Invalid vendor id');
  const profile = await VendorProfile.findById(profileId).select('userId vendorType businessName');
  if (!profile) throw ApiError.notFound('Vendor business line not found');
  return profile;
}

export async function getAcceptanceMode(profileId) {
  const profile = await loadProfile(profileId);
  const spec = SUPPORTED[profile.vendorType];

  if (!spec) {
    return {
      vendorType: profile.vendorType,
      businessName: profile.businessName,
      supported: false,
      requiresAcceptance: false,
      reason: 'This business line sells against published capacity, so there is nothing to accept.',
    };
  }

  let requiresAcceptance = false;
  if (spec.model === 'provider') {
    const provider = await Provider.findOne({
      vendorUserId: profile.userId,
      type: spec.providerType,
    }).select('details');
    requiresAcceptance = provider?.details?.requiresAcceptance === true;
  } else {
    const doctor = await Doctor.findOne({ clinicVendorId: profile.userId }).select('policies');
    requiresAcceptance = doctor?.policies?.requiresAcceptance === true;
  }

  return {
    vendorType: profile.vendorType,
    businessName: profile.businessName,
    supported: true,
    requiresAcceptance,
  };
}

/**
 * Flip the mode.
 *
 * Turning it ON is the consequential direction: from that point the partner
 * has a hard deadline on every request, and missing it auto-declines the
 * booking, refunds the customer and costs them a compliance point. So the
 * partner is told, rather than discovering it when the first one expires.
 */
export async function setAcceptanceMode(actor, profileId, requiresAcceptance, ip) {
  const profile = await loadProfile(profileId);
  const spec = SUPPORTED[profile.vendorType];
  if (!spec) {
    throw ApiError.badRequest(
      `${profile.vendorType} bookings are sold against published capacity and cannot require acceptance`
    );
  }

  const before = (await getAcceptanceMode(profileId)).requiresAcceptance;

  let updated = 0;
  if (spec.model === 'provider') {
    const res = await Provider.updateMany(
      { vendorUserId: profile.userId, type: spec.providerType },
      { $set: { 'details.requiresAcceptance': Boolean(requiresAcceptance) } }
    );
    updated = res.modifiedCount;
  } else {
    // A clinic may run several vets; the mode is a clinic-level policy.
    const res = await Doctor.updateMany(
      { clinicVendorId: profile.userId },
      { $set: { 'policies.requiresAcceptance': Boolean(requiresAcceptance) } }
    );
    updated = res.modifiedCount;
  }

  if (!updated && requiresAcceptance !== before) {
    throw ApiError.notFound('No service record found for this business line to update');
  }

  await writeAudit(actor, {
    action: 'vendor.acceptance_mode',
    targetType: 'vendor',
    targetId: profileId,
    before: { requiresAcceptance: before },
    after: { requiresAcceptance: Boolean(requiresAcceptance), vendorType: profile.vendorType },
    ip,
  });

  if (requiresAcceptance !== before) {
    await notify(profile.userId, {
      title: requiresAcceptance ? 'You now accept bookings manually' : 'Bookings now confirm automatically',
      body: requiresAcceptance
        ? 'New bookings will wait for you to Accept or Decline. Requests you do not answer in time are declined automatically, the customer is refunded, and it counts against your service standing.'
        : 'New bookings will confirm automatically as soon as the customer pays. You no longer need to accept them.',
      type: 'system',
      link: '/vendor/compliance',
      data: { kind: 'acceptance_mode', requiresAcceptance: String(Boolean(requiresAcceptance)) },
    }).catch(() => {});
  }

  return getAcceptanceMode(profileId);
}
