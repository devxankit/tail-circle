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

/**
 * Accept a booking request that is waiting on this partner.
 *
 * Only reachable from `awaiting_vendor`. Partners on auto-confirm never see
 * these — their bookings arrive already confirmed.
 */
export async function acceptProviderBooking(vertical, id, note = '') {
  const { data } = await api.post(`${base(vertical)}/bookings/${id}/accept`, { note });
  return data;
}

/** Decline a request. The customer is refunded in full, automatically. */
export async function rejectProviderBooking(vertical, id, reason) {
  const { data } = await api.post(`${base(vertical)}/bookings/${id}/reject`, { reason });
  return data;
}

/* ── Booking requests awaiting this partner ───────────────── */

/*
 * Vertical-agnostic: the API resolves ownership per vertical, so one set of
 * calls serves every panel. The `provider*` variants above address bookings
 * under the grooming/daycare base paths.
 */
export async function fetchPendingBookingRequests() {
  const { data } = await api.get('/vendor/bookings/pending');
  return data;
}

export async function acceptBookingRequest(id, note = '') {
  const { data } = await api.post(`/vendor/bookings/${id}/accept`, { note });
  return data;
}

export async function rejectBookingRequest(id, reason) {
  const { data } = await api.post(`/vendor/bookings/${id}/reject`, { reason });
  return data;
}

/* ── Compliance standing ──────────────────────────────────── */

/** This partner's service-failure record and how close they are to review. */
export async function fetchVendorCompliance() {
  const { data } = await api.get('/vendor/compliance');
  return data;
}

export async function acknowledgeVendorCompliance() {
  const { data } = await api.post('/vendor/compliance/acknowledge');
  return data;
}

/** Warnings, withdrawals, suspensions and reinstatements sent to this partner. */
export async function fetchVendorComplianceUpdates() {
  const { data } = await api.get('/vendor/compliance/updates');
  return data;
}

/** The rules they are held to, so the policy is never a surprise. */
export async function fetchVendorCompliancePolicy() {
  const { data } = await api.get('/vendor/compliance/policy');
  return data;
}
