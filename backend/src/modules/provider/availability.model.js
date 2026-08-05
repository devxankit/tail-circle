import mongoose from 'mongoose';
import { CONSULT_MODES } from './doctor.model.js';

/**
 * A vet's bookable schedule — the replacement for the old global
 * `DOCTOR_SLOT_TEMPLATE`, which handed every doctor the same three fixed
 * two-hour blocks on every day of the year.
 *
 * Slots are **generated**, never stored: a weekly pattern of working blocks is
 * walked in `slotMinutes + bufferMinutes` steps at request time. Only the
 * capacity counters for slots someone actually booked get persisted, in the
 * existing `SlotBooking` collection.
 *
 * Each block declares which consult modes it serves, which is how a vet offers
 * (say) video only in the evening while taking in-clinic patients all day.
 */

/** "09:00" → 540. Returns null for anything malformed. */
export function toMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** 540 → "09:00" */
export function toHHMM(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 540 → "09:00 AM" — the human label used as the slot key and shown in the UI. */
export function toLabel(minutes) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** Morning / Afternoon / Evening — drives the grouping headers on the booking screen. */
export function periodFor(minutes) {
  if (minutes < 12 * 60) return 'Morning';
  if (minutes < 17 * 60) return 'Afternoon';
  return 'Evening';
}

const blockSchema = new mongoose.Schema(
  {
    _id: false,
    start: { type: String, required: true }, // "09:00"
    end: { type: String, required: true },   // "13:00"
    // Which consult modes this block serves. Empty ⇒ every mode the vet offers.
    modes: {
      type: [String],
      enum: CONSULT_MODES,
      default: [],
    },
    // Parallel consults in one slot (a clinic running two rooms). 1 = strict.
    capacity: { type: Number, default: 1, min: 1, max: 20 },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    _id: false,
    day: { type: Number, required: true, min: 0, max: 6 }, // 0 = Sunday
    enabled: { type: Boolean, default: false },
    blocks: { type: [blockSchema], default: [] },
  },
  { _id: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
      unique: true,
      index: true,
    },

    weekly: {
      type: [daySchema],
      default: () => Array.from({ length: 7 }, (_, day) => ({ day, enabled: false, blocks: [] })),
    },

    // Consult length. The vet's per-mode `durationMinutes` overrides this when set.
    slotMinutes: { type: Number, default: 15, min: 5, max: 180 },
    // Gap between consecutive consults (notes, room turnaround).
    bufferMinutes: { type: Number, default: 0, min: 0, max: 60 },

    // After-hours / emergency availability, kept separate from the weekly grid.
    emergency: {
      enabled: { type: Boolean, default: false },
      alwaysOn: { type: Boolean, default: false }, // 24×7 emergency cover
      blocks: { type: [blockSchema], default: [] },
    },

    // Leave, holidays, conference days — removed from generation entirely.
    blackouts: {
      type: [
        {
          _id: false,
          date: { type: String, required: true }, // YYYY-MM-DD
          reason: { type: String, default: '' },
        },
      ],
      default: [],
    },

    // Minimum notice before a slot can be booked.
    leadTimeMinutes: { type: Number, default: 60, min: 0 },
    // How far ahead the calendar opens.
    horizonDays: { type: Number, default: 30, min: 1, max: 180 },

    // IANA zone the blocks are expressed in.
    timezone: { type: String, default: 'Asia/Kolkata' },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Reject blocks that end before they start or that don't parse. */
availabilitySchema.pre('validate', function validateBlocks() {
  const check = (blocks, where) => {
    for (const b of blocks || []) {
      const start = toMinutes(b.start);
      const end = toMinutes(b.end);
      if (start === null || end === null) {
        throw new Error(`${where}: times must be HH:mm (got ${b.start}–${b.end})`);
      }
      if (end <= start) {
        throw new Error(`${where}: end time must be after start (${b.start}–${b.end})`);
      }
    }
  };

  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const day of this.weekly || []) check(day.blocks, DAYS[day.day] ?? `day ${day.day}`);
  check(this.emergency?.blocks, 'emergency');
});

export const Availability = mongoose.model('Availability', availabilitySchema);
export default Availability;
