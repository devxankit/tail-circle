import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { ServiceArea } from './serviceArea.model.js';
import { writeAudit } from './admin.service.js';

/**
 * Service area management.
 *
 * Read side is deliberately cheap and forgiving: `checkServiceable` is called
 * from the customer app on address entry, and an area list that has never been
 * populated must not block anybody. Until an operator defines the first area,
 * everywhere is treated as serviceable — turning a brand-new install into a
 * platform that refuses every booking would be a worse failure than the gap
 * this closes.
 */

const PINCODE = /^\d{6}$/;

const serialize = (a) => ({
  _id: String(a._id),
  name: a.name,
  city: a.city,
  state: a.state || '',
  pincodes: a.pincodes || [],
  pincodeCount: (a.pincodes || []).length,
  verticals: a.verticals || [],
  active: a.active,
  launchedAt: a.launchedAt,
  note: a.note || '',
  createdAt: a.createdAt,
});

export async function listServiceAreas({ city, active } = {}) {
  const filter = {};
  if (city && city !== 'All') filter.city = city;
  if (active === 'true') filter.active = true;
  if (active === 'false') filter.active = false;

  const rows = await ServiceArea.find(filter).sort({ city: 1, name: 1 }).lean();
  const cities = [...new Set(rows.map((r) => r.city))].sort();
  return {
    rows: rows.map(serialize),
    cities,
    totals: {
      areas: rows.length,
      active: rows.filter((r) => r.active).length,
      pincodes: rows.reduce((s, r) => s + (r.pincodes || []).length, 0),
    },
  };
}

function cleanPincodes(list) {
  const out = [...new Set((list || []).map((p) => String(p).trim()))].filter(Boolean);
  const bad = out.filter((p) => !PINCODE.test(p));
  if (bad.length) {
    throw ApiError.badRequest(`Not valid six-digit pincodes: ${bad.slice(0, 5).join(', ')}`);
  }
  return out;
}

export async function createServiceArea(actor, body, ip) {
  const pincodes = cleanPincodes(body.pincodes);

  /*
   * A pincode belonging to two areas makes "which area serves this address?"
   * ambiguous, and every downstream answer with it. Caught here rather than
   * left to surprise somebody later.
   */
  const clash = await ServiceArea.findOne({ pincodes: { $in: pincodes } }).select('name city').lean();
  if (clash) {
    throw ApiError.conflict(
      `One or more of those pincodes already belong to "${clash.name}" (${clash.city})`
    );
  }

  const area = await ServiceArea.create({
    name: body.name.trim(),
    city: body.city.trim(),
    state: body.state?.trim() || '',
    pincodes,
    verticals: body.verticals || [],
    active: body.active !== false,
    launchedAt: body.active !== false ? new Date() : null,
    note: body.note || '',
  });

  await writeAudit(actor, {
    action: 'service_area.create',
    targetType: 'service_area',
    targetId: String(area._id),
    after: { name: area.name, city: area.city, pincodes: pincodes.length },
    ip,
  });
  return serialize(area);
}

export async function updateServiceArea(actor, id, body, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid service area id');
  const area = await ServiceArea.findById(id);
  if (!area) throw ApiError.notFound('Service area not found');

  const before = { active: area.active, pincodes: area.pincodes.length };

  if (body.pincodes) {
    const pincodes = cleanPincodes(body.pincodes);
    const clash = await ServiceArea.findOne({
      _id: { $ne: area._id },
      pincodes: { $in: pincodes },
    }).select('name city').lean();
    if (clash) {
      throw ApiError.conflict(
        `One or more of those pincodes already belong to "${clash.name}" (${clash.city})`
      );
    }
    area.pincodes = pincodes;
  }

  for (const key of ['name', 'city', 'state', 'note']) {
    if (body[key] !== undefined) area[key] = String(body[key]).trim();
  }
  if (body.verticals !== undefined) area.verticals = body.verticals;
  if (body.active !== undefined) {
    area.active = Boolean(body.active);
    if (area.active && !area.launchedAt) area.launchedAt = new Date();
  }

  await area.save();
  await writeAudit(actor, {
    action: 'service_area.update',
    targetType: 'service_area',
    targetId: id,
    before,
    after: { active: area.active, pincodes: area.pincodes.length },
    ip,
  });
  return serialize(area);
}

export async function deleteServiceArea(actor, id, ip) {
  if (!mongoose.isValidObjectId(id)) throw ApiError.badRequest('Invalid service area id');
  const area = await ServiceArea.findByIdAndDelete(id);
  if (!area) throw ApiError.notFound('Service area not found');
  await writeAudit(actor, {
    action: 'service_area.delete',
    targetType: 'service_area',
    targetId: id,
    before: { name: area.name, city: area.city, pincodes: area.pincodes.length },
    ip,
  });
  return { id, name: area.name };
}

/**
 * Do we serve this pincode?
 *
 * Returns `serviceable: true` when no areas are configured at all. A fresh
 * install with an empty area list must not refuse every customer — the absence
 * of a policy is not a policy of refusal.
 */
export async function checkServiceable(pincode, vertical = null) {
  const code = String(pincode || '').trim();
  if (!PINCODE.test(code)) {
    return { serviceable: false, reason: 'That does not look like a valid six-digit pincode' };
  }

  const configured = await ServiceArea.countDocuments();
  if (configured === 0) {
    return { serviceable: true, area: null, reason: 'No service areas configured yet' };
  }

  const area = await ServiceArea.findOne({ pincodes: code, active: true }).lean();
  if (!area) {
    const paused = await ServiceArea.findOne({ pincodes: code, active: false }).select('name city').lean();
    return {
      serviceable: false,
      area: null,
      reason: paused
        ? `${paused.name} is temporarily paused`
        : 'We are not in this area yet',
    };
  }

  // An area can be live for grooming and not yet for daycare.
  if (vertical && area.verticals?.length && !area.verticals.includes(vertical)) {
    return {
      serviceable: false,
      area: serialize(area),
      reason: `${area.name} is live, but ${vertical} has not launched there yet`,
    };
  }

  return { serviceable: true, area: serialize(area) };
}
