import { api } from './api';

/**
 * Vet consultations — doctor lookup, consult modes, and live slot availability.
 *
 * Slots are never hardcoded here: they come from the vet's own working days,
 * time blocks and consult duration on the server. A mode the vet has not
 * enabled has no slots and cannot be booked, so the UI must render its options
 * from `enabledModes()` rather than assuming every vet does video.
 */

/** Consult modes as the profile keys them → booking `visitType` + display copy. */
export const MODE_META = {
  inClinic: { visitType: 'clinic', label: 'In-Clinic Visit', short: 'In-Clinic' },
  video: { visitType: 'video', label: 'Video Consultation', short: 'Video' },
  homeVisit: { visitType: 'home', label: 'Home Visit', short: 'Home Visit' },
  emergency: { visitType: 'emergency', label: 'Emergency Consult', short: 'Emergency' },
};

const MODE_ORDER = ['inClinic', 'video', 'homeVisit', 'emergency'];

/** Why a date has no slots — copy shown in place of an empty grid. */
export const SLOT_EMPTY_REASON = {
  mode_not_offered: 'This vet does not offer this consultation type.',
  not_a_working_day: 'The vet does not work on this day.',
  no_blocks_for_mode: 'No sessions of this type on this day.',
  blackout: 'The vet is unavailable on this date.',
  past_date: 'That date has already passed.',
  beyond_horizon: 'Bookings are not open this far ahead yet.',
  not_accepting_bookings: 'This vet is not accepting bookings right now.',
  emergency_hours_not_set: 'This vet has not opened any emergency hours.',
  invalid_mode: 'Unsupported consultation type.',
};

/**
 * The consult modes a vet actually offers, in display order, each with its own
 * fee and duration. Returns `[]` for legacy records with no `modes` block.
 */
export function enabledModes(doctor) {
  const modes = doctor?.modes || {};
  return MODE_ORDER.filter((m) => modes[m]?.enabled).map((mode) => ({
    mode,
    ...MODE_META[mode],
    fee: modes[mode].fee ?? 0,
    followUpFee: modes[mode].followUpFee ?? null,
    durationMinutes: modes[mode].durationMinutes ?? 15,
  }));
}

/** Does this vet take video consultations? */
export const offersVideo = (doctor) => Boolean(doctor?.modes?.video?.enabled);

export async function getDoctor(id) {
  const { data } = await api.get(`/doctors/${id}`);
  return data;
}

export async function getDoctors() {
  const { data } = await api.get('/doctors');
  return data;
}

/**
 * Slots for one vet, one date, one mode.
 * Returns `{ slots, reason }` — `reason` explains an empty list.
 */
export async function getDoctorSlots(doctorId, date, visitType = 'clinic') {
  const { data, meta } = await api.get(`/doctors/${doctorId}/slots`, {
    params: { date, visitType },
  });
  return {
    slots: data || [],
    reason: meta?.reason || null,
    fee: meta?.fee ?? null,
    message: meta?.reason ? SLOT_EMPTY_REASON[meta.reason] || 'No slots available.' : null,
  };
}

/** YYYY-MM-DD in the user's local zone (never via toISOString, which shifts to UTC). */
export function toYMD(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The next `count` calendar days as pickable date descriptors. */
export function upcomingDates(count = 14) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      ymd: toYMD(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      isToday: i === 0,
    };
  });
}

/** Create the consultation booking. Razorpay bookings come back with an order. */
export async function createConsultBooking({
  doctorId,
  date,
  time,
  visitType,
  petId,
  paymentMethod = 'razorpay',
  meta,
}) {
  const { data } = await api.post('/bookings', {
    type: 'doctor',
    doctorId: String(doctorId),
    schedule: { startDate: date, time },
    visitType,
    ...(petId ? { petId } : {}),
    paymentMethod,
    ...(meta ? { meta } : {}),
  });
  return data;
}
