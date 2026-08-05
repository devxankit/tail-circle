import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError.js';
import { AdminConfig } from './admin.models.js';
import { writeAudit } from './admin.service.js';

/**
 * Generic CRUD over the AdminConfig catalog-config store. The super-admin
 * "services" screens (product categories, doctor services, add-ons/amenities,
 * memorial packages, event categories, grooming/day-care) each read one or more
 * `group`s and render the row's `data` verbatim. Icons live in `data.iconName`.
 */
const idOk = (id) => mongoose.isValidObjectId(id);
const serialize = (c) => ({ id: String(c._id), sort: c.sort, ...(c.data || {}) });

export async function listConfig(group) {
  const rows = await AdminConfig.find({ group }).sort({ sort: 1, createdAt: 1 });
  return rows.map(serialize);
}

export async function createConfig(actor, group, body, ip) {
  const max = await AdminConfig.findOne({ group }).sort({ sort: -1 }).select('sort');
  const data = { status: 'Active', ...body };
  const c = await AdminConfig.create({ group, sort: (max?.sort || 0) + 1, data });
  await writeAudit(actor, { action: 'config.create', targetType: 'config', targetId: c._id, after: { group }, ip });
  return serialize(c);
}

export async function updateConfig(actor, id, patch, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid config id');
  const c = await AdminConfig.findById(id);
  if (!c) throw ApiError.notFound('Config entry not found');
  const next = { ...(c.data || {}) };
  for (const [k, v] of Object.entries(patch || {})) {
    if (k === 'sort') c.sort = v;
    else next[k] = v;
  }
  c.data = next;
  c.markModified('data');
  await c.save();
  await writeAudit(actor, { action: 'config.update', targetType: 'config', targetId: id, after: { group: c.group }, ip });
  return serialize(c);
}

export async function deleteConfig(actor, id, ip) {
  if (!idOk(id)) throw ApiError.badRequest('Invalid config id');
  const c = await AdminConfig.findByIdAndDelete(id);
  if (!c) throw ApiError.notFound('Config entry not found');
  await writeAudit(actor, { action: 'config.delete', targetType: 'config', targetId: id, after: { group: c.group }, ip });
  return { id };
}
