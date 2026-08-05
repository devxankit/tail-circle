import { api } from './api';

/**
 * Video consultation signalling — the REST half. The media half is
 * `webrtcCall.js`; the two meet at the `roomName` + `iceServers` these calls
 * return, which get passed straight to `createCall()`.
 */

/** Vet starts the consultation — creates the room and rings the pet parent. */
export async function startConsult(bookingId) {
  const { data } = await api.post(`/consults/${bookingId}/start`);
  return data;
}

/** Join (for the pet parent this is accepting the call). */
export async function joinConsult(bookingId) {
  const { data } = await api.post(`/consults/${bookingId}/join`);
  return data;
}

export async function rejectConsult(bookingId) {
  const { data } = await api.post(`/consults/${bookingId}/reject`);
  return data;
}

export async function endConsult(bookingId, { notes } = {}) {
  const { data } = await api.post(`/consults/${bookingId}/end`, notes ? { notes } : {});
  return data;
}

/** Pet parent approves per-minute charging past the booked duration. */
export async function consentToOverage(bookingId) {
  const { data } = await api.post(`/consults/${bookingId}/overage/consent`);
  return data;
}

/** Vet forgives the overage before it is invoiced. */
export async function waiveOverage(bookingId) {
  const { data } = await api.post(`/consults/${bookingId}/overage/waive`);
  return data;
}

/** Rehydrate after a reload — returns fresh TURN credentials when the call is live. */
export async function getConsult(bookingId) {
  const { data } = await api.get(`/consults/${bookingId}`);
  return data;
}

/** Any live call this user is party to, for resuming after a refresh. */
export async function getActiveConsult() {
  const { data } = await api.get('/consults/active');
  return data;
}
