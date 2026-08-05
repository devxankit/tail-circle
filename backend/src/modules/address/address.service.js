import { ApiError } from '../../utils/ApiError.js';
import { Address } from './address.model.js';

const MAX_ADDRESSES = 10;

function toGeoPoint(location) {
  if (!location) return undefined;
  return { type: 'Point', coordinates: [location.lng, location.lat] };
}

export async function listAddresses(userId) {
  return Address.find({ userId, deletedAt: null }).sort({ isDefault: -1, updatedAt: -1 });
}

export async function createAddress(userId, data) {
  const count = await Address.countDocuments({ userId, deletedAt: null });
  if (count >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses`);
  }

  // First address is always the default.
  const isDefault = count === 0 ? true : Boolean(data.isDefault);
  if (isDefault && count > 0) {
    await Address.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
  }

  return Address.create({
    ...data,
    location: toGeoPoint(data.location),
    userId,
    isDefault,
  });
}

async function getOwned(userId, addressId) {
  const address = await Address.findOne({ _id: addressId, userId, deletedAt: null });
  if (!address) throw ApiError.notFound('Address not found');
  return address;
}

export async function updateAddress(userId, addressId, data) {
  const address = await getOwned(userId, addressId);

  // Ordered update: clear the old default first so there is never a window
  // with two defaults (a brief window with none is harmless).
  if (data.isDefault === true && !address.isDefault) {
    await Address.updateMany({ userId, isDefault: true }, { $set: { isDefault: false } });
  }
  if (data.isDefault === false && address.isDefault) {
    throw ApiError.badRequest('Set another address as default instead of unsetting this one');
  }

  Object.assign(address, { ...data, location: toGeoPoint(data.location) ?? address.location });
  await address.save();
  return address;
}

export async function deleteAddress(userId, addressId) {
  const address = await getOwned(userId, addressId);
  address.deletedAt = new Date();
  address.isDefault = false;
  await address.save();

  // Keep an obvious default if any addresses remain.
  const next = await Address.findOne({ userId, deletedAt: null }).sort({ updatedAt: -1 });
  if (next && !(await Address.exists({ userId, deletedAt: null, isDefault: true }))) {
    next.isDefault = true;
    await next.save();
  }
}
