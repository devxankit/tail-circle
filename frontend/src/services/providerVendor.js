import { api } from './api';

/**
 * API client for the two Provider-backed vendor portals — grooming salons and
 * daycare centres. Both expose the same surface, so one client serves both;
 * `vertical` picks the mount point (`/vendor/grooming` or `/vendor/daycare`).
 *
 * Every endpoint is scoped server-side to the logged-in vendor's own Provider,
 * so nothing here needs (or accepts) a provider id.
 */

const base = (vertical) => `/vendor/${vertical}`;

export const VERTICAL_COPY = {
  grooming: {
    title: 'Grooming Partner',
    providerNoun: 'salon',
    serviceNoun: 'package',
    servicePlural: 'Packages & Add-ons',
    defaultKind: 'package',
    bookingNoun: 'appointment',
  },
  daycare: {
    title: 'Day Care Partner',
    providerNoun: 'centre',
    serviceNoun: 'plan',
    servicePlural: 'Plans & Add-ons',
    defaultKind: 'plan',
    bookingNoun: 'stay',
  },
};

export async function fetchProviderSummary(vertical) {
  const { data } = await api.get(`${base(vertical)}/summary`);
  return data;
}

export async function fetchProviderProfile(vertical) {
  const { data } = await api.get(`${base(vertical)}/profile`);
  return data;
}

export async function updateProviderProfile(vertical, patch) {
  const { data } = await api.patch(`${base(vertical)}/profile`, patch);
  return data;
}

export async function fetchProviderServices(vertical) {
  const { data } = await api.get(`${base(vertical)}/services`);
  return data;
}

export async function createProviderService(vertical, body) {
  const { data } = await api.post(`${base(vertical)}/services`, body);
  return data;
}

export async function updateProviderService(vertical, id, patch) {
  const { data } = await api.patch(`${base(vertical)}/services/${id}`, patch);
  return data;
}

export async function deleteProviderService(vertical, id) {
  await api.delete(`${base(vertical)}/services/${id}`);
}

export async function fetchProviderSlots(vertical) {
  const { data } = await api.get(`${base(vertical)}/slots`);
  return data;
}

export async function saveProviderSlots(vertical, slotTemplate) {
  const { data } = await api.put(`${base(vertical)}/slots`, { slotTemplate });
  return data;
}

/**
 * `filters` accepts `status`, `date` (YYYY-MM-DD) and `visitType`. The date
 * filter backs the day sheet — the vendor's view of the same slot grid the
 * customer booked from. A bare string is still accepted as a status for the
 * daycare portal, which calls this with one positional argument.
 */
export async function fetchProviderBookings(vertical, filters) {
  const params = typeof filters === 'string' ? { status: filters } : (filters || {});
  const { data } = await api.get(`${base(vertical)}/bookings`, { params });
  return data;
}

export async function updateProviderBookingStatus(vertical, id, status, note) {
  const { data } = await api.patch(`${base(vertical)}/bookings/${id}/status`, { status, note });
  return data;
}
