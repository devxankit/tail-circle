import { ApiError } from '../../utils/ApiError.js';
import { Doctor, CONSULT_MODES, modeForVisitType } from './doctor.model.js';
import {
  Availability,
  toMinutes,
  toHHMM,
  toLabel,
  periodFor,
} from './availability.model.js';

/**
 * Slot generation for vet consultations.
 *
 * Availability blocks are **wall-clock times in the clinic's own timezone**, so
 * every "is this slot in the past?" decision has to be made in that zone — the
 * API process may well be running in UTC. `nowInZone()` and `zonedTimeToUtc()`
 * below do that with Intl alone (no date library added to the dependency tree).
 */

/* ── Timezone helpers ─────────────────────────────────────────────── */

/** Offset of `timeZone` from UTC, in minutes, at the given instant (IST → +330). */
function zoneOffsetMinutes(date, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
}

/** Wall-clock date + minute-of-day in `timeZone` → the true UTC instant. */
export function zonedTimeToUtc(dateStr, minutes, timeZone) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Two-pass: correct the naive guess by the zone's offset at that instant.
  const offset = zoneOffsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60000);
}

/** Today's date and minute-of-day as seen in `timeZone`. */
export function nowInZone(timeZone) {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    minutes: (+p.hour % 24) * 60 + +p.minute,
  };
}

/** Whole days between two YYYY-MM-DD strings (b − a). */
function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Weekday index (0 = Sunday) for a YYYY-MM-DD string, zone-independent. */
function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/* ── Defaults ─────────────────────────────────────────────────────── */

/**
 * Availability for a vet who has never opened the scheduler. Mon–Sat, 10:00–13:00
 * and 17:00–20:00, in-clinic only — deliberately conservative: video consults
 * stay off until the vet turns them on explicitly.
 */
export function defaultAvailability(doctorId) {
  return {
    doctorId,
    weekly: Array.from({ length: 7 }, (_, day) => ({
      day,
      enabled: day !== 0, // closed Sundays
      blocks: day === 0 ? [] : [
        { start: '00:00', end: '23:59', modes: ['inClinic', 'video'], capacity: 1 },
      ],
    })),
    slotMinutes: 15,
    bufferMinutes: 0,
    emergency: { enabled: false, alwaysOn: false, blocks: [] },
    blackouts: [],
    leadTimeMinutes: 0,
    horizonDays: 30,
    timezone: 'Asia/Kolkata',
    active: true,
  };
}

/** The vet's availability, creating the conservative default on first access. */
export async function getOrCreateAvailability(doctorId) {
  const existing = await Availability.findOne({ doctorId });
  if (existing) return existing;
  return Availability.create(defaultAvailability(doctorId));
}

/* ── Slot generation ──────────────────────────────────────────────── */

/**
 * Bookable slots for one vet, one date, one consult mode.
 *
 * Returns `[]` — never throws — when the date is simply not workable (past,
 * blacked out, closed weekday, beyond the horizon, mode not offered). Callers
 * that need the reason read `meta.reason`.
 */
export async function generateSlots({ doctor, availability, date, mode }) {
  const tz = availability.timezone || 'Asia/Kolkata';
  const now = nowInZone(tz);

  const reject = (reason) => ({ slots: [], meta: { reason, date, mode, timezone: tz } });

  if (!CONSULT_MODES.includes(mode)) return reject('invalid_mode');
  if (!doctor.offersMode(mode)) return reject('mode_not_offered');
  if (!availability.active) return reject('not_accepting_bookings');

  const offset = daysBetween(now.date, date);
  if (offset < 0) return reject('past_date');
  if (offset > (availability.horizonDays ?? 30)) return reject('beyond_horizon');

  const blackout = (availability.blackouts || []).find((b) => b.date === date);
  if (blackout) return { slots: [], meta: { reason: 'blackout', note: blackout.reason, date, mode, timezone: tz } };

  // Emergency cover is scheduled separately from the weekly grid.
  let blocks;
  if (mode === 'emergency') {
    // The vet offers emergency consults but has not opened any emergency hours
    // — a different situation from not offering the mode at all.
    if (!availability.emergency?.enabled) return reject('emergency_hours_not_set');
    blocks = availability.emergency.alwaysOn
      ? [{ start: '00:00', end: '23:59', capacity: 1, modes: ['emergency'] }]
      : availability.emergency.blocks || [];
  } else {
    const day = (availability.weekly || []).find((d) => d.day === weekdayOf(date));
    if (!day?.enabled) return reject('not_a_working_day');
    // An empty `modes` list means the block serves every mode the vet offers.
    blocks = (day.blocks || []).filter((b) => !b.modes?.length || b.modes.includes(mode));
  }

  if (!blocks.length) return reject('no_blocks_for_mode');

  // Per-mode consult length wins over the schedule-wide default.
  const slotMinutes = doctor.modes?.[mode]?.durationMinutes || availability.slotMinutes || 15;
  const step = slotMinutes + (availability.bufferMinutes || 0);

  // For current day (offset === 0), include the current ongoing slot (starting at the nearest slot interval)
  const currentSlotStart = Math.floor(now.minutes / slotMinutes) * slotMinutes;
  const earliest = offset === 0
    ? Math.min(now.minutes + (availability.leadTimeMinutes ?? 0), currentSlotStart)
    : -Infinity;

  const slots = [];
  const seen = new Set();

  for (const block of blocks) {
    const start = toMinutes(block.start);
    const end = toMinutes(block.end);
    if (start === null || end === null) continue;

    for (let t = start; t + slotMinutes <= end; t += step) {
      if (t < earliest) continue;           // too soon / already past
      const label = toLabel(t);
      if (seen.has(label)) continue;        // overlapping blocks
      seen.add(label);

      slots.push({
        time: label,                        // slot key — matches SlotBooking.time
        start: toHHMM(t),
        end: toHHMM(t + slotMinutes),
        period: periodFor(t),
        durationMinutes: slotMinutes,
        capacity: block.capacity || 1,
        startAt: zonedTimeToUtc(date, t, tz).toISOString(),
        available: true,                    // capacity subtracted by the caller
      });
    }
  }

  slots.sort((a, b) => (a.start < b.start ? -1 : 1));
  return { slots, meta: { date, mode, timezone: tz, slotMinutes, count: slots.length } };
}

/**
 * Public entry point: slots for a vet on a date, with booked capacity removed.
 * `SlotBooking` stays the atomic source of truth for what is actually taken.
 */
export async function getDoctorSlots({ doctorId, date, visitType = 'clinic', includeFull = false }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
    throw ApiError.badRequest('date=YYYY-MM-DD is required');
  }
  const mode = modeForVisitType(visitType) || visitType;

  // Accept either a Mongo id or the mock numeric `legacyId`, as every other
  // doctor lookup in the codebase does.
  const or = [{ legacyId: Number(doctorId) || -1 }];
  if (/^[0-9a-f]{24}$/i.test(String(doctorId))) or.push({ _id: doctorId });
  const doctor = await Doctor.findOne({ $or: or });
  if (!doctor) throw ApiError.notFound('Doctor not found');

  const availability = await getOrCreateAvailability(doctor._id);
  const { slots, meta } = await generateSlots({ doctor, availability, date, mode });
  if (!slots.length) return { slots: [], meta };

  // Lazy import keeps the provider module free of a booking-module cycle.
  const { SlotBooking } = await import('../booking/slot.model.js');
  const counters = await SlotBooking.find({
    doctorId: doctor._id,
    date,
    time: { $in: slots.map((s) => s.time) },
  });
  const booked = new Map(counters.map((c) => [c.time, c]));

  const fee = doctor.feeFor(mode);
  const priced = slots.map((s) => {
    const counter = booked.get(s.time);
    return {
      ...s,
      fee,
      booked: counter?.booked || 0,
      available: !counter || counter.booked < (counter.capacity ?? s.capacity),
    };
  });

  return {
    slots: includeFull ? priced : priced.filter((s) => s.available),
    meta: { ...meta, fee },
  };
}
