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
    title: 'Grooming Salon',
    providerNoun: 'salon',
    serviceNoun: 'package',
    servicePlural: 'Packages & Add-ons',
    defaultKind: 'package',
    bookingNoun: 'appointment',
  },
  daycare: {
    title: 'Daycare Centre',
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

export async function fetchProviderBookings(vertical, status) {
  const { data } = await api.get(`${base(vertical)}/bookings`, { params: { status } });
  return data;
}

export async function updateProviderBookingStatus(vertical, id, status, note) {
  const { data } = await api.patch(`${base(vertical)}/bookings/${id}/status`, { status, note });
  return data;
}
