import { ApiError } from '../../utils/ApiError.js';
import { refundPayment } from '../../services/razorpay.service.js';
import { notify } from '../../services/notify.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { Payment } from '../payment/payment.model.js';
import { Provider } from '../provider/provider.model.js';
import { ServiceOffering } from '../provider/serviceOffering.model.js';
import { Doctor, modeForVisitType } from '../provider/doctor.model.js';
import { getDoctorSlots } from '../provider/availability.service.js';
import { Event } from '../provider/event.model.js';
import { Pet } from '../pet/pet.model.js';
import { Address } from '../address/address.model.js';
import { SlotBooking } from './slot.model.js';
import { Booking, CANCELLABLE_BOOKING_STATUSES } from './booking.model.js';

const toPaise = (rupees) => Math.round(rupees * 100);

const isObjectId = (v) => /^[0-9a-f]{24}$/i.test(String(v));

/** Find by Mongo id or mock legacyId (string for providers, number for docs/events). */
function idOrLegacyFilter(id, { numericLegacy = false } = {}) {
  const or = [];
  if (isObjectId(id)) or.push({ _id: id });
  or.push({ legacyId: numericLegacy ? Number(id) || -1 : String(id) });
  return { $or: or };
}

/**
 * Resolve offerings by their public handle, scoped to provider (or
 * platform-wide).
 *
 * The handle is `legacyId` for seeded mock catalogue rows and the Mongo `_id`
 * for anything a vendor created from their dashboard — vendor-created services
 * have no legacyId, so matching on legacyId alone (as this did) meant a salon's
 * own packages and add-ons could never be booked.
 */
async function resolveOfferings(providerId, providerType, refs) {
  if (!refs?.length) return [];
  const handles = refs.map((r) => String(r.refId));
  const offerings = await ServiceOffering.find({
    $and: [
      {
        $or: [
          { legacyId: { $in: handles } },
          { _id: { $in: handles.filter(isObjectId) } },
        ],
      },
      { $or: [{ providerId }, { providerId: null }] },
    ],
    providerType,
    active: true,
  });

  const byHandle = new Map();
  for (const o of offerings) {
    if (o.legacyId) byHandle.set(o.legacyId, o);
    byHandle.set(String(o._id), o);
  }

  return refs.map((r) => {
    const offering = byHandle.get(String(r.refId));
    if (!offering) throw ApiError.badRequest(`Unknown service item: ${r.refId}`);
    return {
      kind: offering.kind,
      refId: offering.legacyId || String(offering._id),
      name: offering.name,
      price: offering.price,
      unit: offering.unit,
      qty: Math.max(1, r.qty || 1),
    };
  });
}

// Fixed pricing adjustments the mock flows display — mirrored exactly so the
// charged amount equals what the price-summary screens show (rupees).
const PRICING_RULES = {
  daycare: { discount: 300, platformFee: 49 },
  grooming: { discount: 100, homeVisitFee: 50 },
  doctor: { onlinePlatformFee: 29 }, // DoctorCheckout shows it for prepaid only
};

/**
 * A salon's travel fee and promo discount (rupees). Vendors edit these from the
 * grooming dashboard; the defaults are the numbers the customer-facing price
 * summary has always shown, so an untouched salon prices exactly as before.
 */
export function groomingFeesFor(provider) {
  const configured = provider?.details?.groomingFees || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : fallback);
  return {
    travelFee: num(configured.travelFee, PRICING_RULES.grooming.homeVisitFee),
    discount: num(configured.discount, PRICING_RULES.grooming.discount),
  };
}

/**
 * Daycare reserves a place for a whole day rather than a clock time, but the
 * capacity counter is keyed on (provider, date, time). This sentinel is that
 * key's `time`, so one day = one counter.
 */
const DAY_SLOT = '__day__';

/**
 * A daycare centre's platform fee and promo discount (rupees), matching what
 * the price summary displays. Vendors own the numbers; the defaults are the
 * values the screen has always shown.
 */
export function daycareFeesFor(provider) {
  const configured = provider?.details?.daycareFees || {};
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : fallback);
  return {
    platformFee: num(configured.platformFee, PRICING_RULES.daycare.platformFee),
    discount: num(configured.discount, PRICING_RULES.daycare.discount),
  };
}

/** How many pets the centre can board on any one day. */
export function daycareDailyCapacity(provider) {
  const configured = Number(provider?.details?.dailyCapacity);
  return Number.isFinite(configured) && configured > 0 ? Math.min(500, Math.round(configured)) : 20;
}

/** YYYY-MM-DD → Date at UTC midnight, and back. Avoids any timezone drift. */
const parseYMD = (s) => new Date(`${s}T00:00:00Z`);
const formatYMD = (d) => d.toISOString().slice(0, 10);

/**
 * Every calendar day a stay occupies.
 *
 * The booking screen lets a customer tick individual days (a Tue/Thu-only
 * arrangement is normal), so an explicit `meta.dates` list wins. Otherwise the
 * stay is a contiguous run from `startDate` — bounded by `endDate` when given,
 * else by `durationDays`.
 */
function daycareStayDates(payload, schedule) {
  const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(parseYMD(s).getTime());

  const explicit = payload.meta?.dates;
  if (Array.isArray(explicit) && explicit.length) {
    const unique = [...new Set(explicit.filter(valid))].sort();
    if (unique.length > MAX_STAY_DAYS) throw ApiError.badRequest(`A stay cannot exceed ${MAX_STAY_DAYS} days`);
    return unique;
  }

  if (!valid(schedule.startDate)) return [];
  const start = parseYMD(schedule.startDate);

  let days;
  if (valid(schedule.endDate)) {
    const end = parseYMD(schedule.endDate);
    days = Math.floor((end - start) / 86_400_000) + 1;
    if (days < 1) throw ApiError.badRequest('The end date cannot be before the start date');
  } else {
    days = Math.max(1, Number(schedule.durationDays) || 1);
  }
  if (days > MAX_STAY_DAYS) throw ApiError.badRequest(`A stay cannot exceed ${MAX_STAY_DAYS} days`);

  return Array.from({ length: days }, (_, i) => formatYMD(new Date(start.getTime() + i * 86_400_000)));
}

const MAX_STAY_DAYS = 90;

/**
 * How many pets the salon takes in one slot. Read from the vendor's own slot
 * template — this used to be hard-coded to 2 for every provider, so a
 * one-groomer salon that set capacity 1 still got double-booked.
 */
function slotCapacity(provider, time) {
  const entry = (provider?.details?.slotTemplate || []).find((t) => t.time === time);
  const capacity = Number(entry?.capacity);
  return Number.isFinite(capacity) && capacity > 0 ? Math.min(50, Math.round(capacity)) : 1;
}

/** Human labels for consult modes — used in item names and error messages. */
const MODE_LABEL = {
  inClinic: 'Clinic Consultation',
  video: 'Video Consultation',
  instantVideo: 'Instant Video Call',
  homeVisit: 'Home Visit',
  emergency: 'Emergency Consultation',
};

/**
 * Modes that must be paid before the appointment exists.
 *
 * In-clinic and home visits involve a physical handover, so cash-on-arrival is
 * legitimate. A video consult does not: the room opens as soon as the vet
 * starts it and there is no point at which anyone can collect payment, so
 * `pay_later` would hand out a free consultation.
 */
const PREPAID_MODES = new Set(['video', 'instantVideo']);

/**
 * Was there a completed consult with this vet for this pet recently enough to
 * price as a follow-up? Window is the vet's own `policies.followUpWindowDays`.
 */
async function isFollowUpVisit(userId, doctor, petId) {
  const days = doctor.policies?.followUpWindowDays ?? 0;
  if (!days || !petId) return false;

  const since = new Date(Date.now() - days * 86_400_000);
  const previous = await Booking.exists({
    userId,
    doctorId: doctor._id,
    petId,
    status: 'completed',
    updatedAt: { $gte: since },
  });
  return Boolean(previous);
}

/**
 * Exactly what a consultation will be billed, for this user, this vet, this
 * mode and this pet — follow-up rate included.
 *
 * The public slots endpoint cannot answer this: it is unauthenticated, so it
 * quotes `doctor.feeFor(mode)` with no follow-up discount, and the checkout
 * screen showed that full fee while `buildBooking` charged the follow-up rate.
 * Both sides now read this one function.
 */
export async function quoteConsult({ userId, doctor, mode, petId, paymentMethod = 'razorpay' }) {
  const isFollowUp = await isFollowUpVisit(userId, doctor, petId);
  const fee = doctor.feeFor(mode, { followUp: isFollowUp });
  if (fee == null) throw ApiError.badRequest('This consultation type is unavailable');
  const platformFee = paymentMethod === 'razorpay' ? PRICING_RULES.doctor.onlinePlatformFee : 0;
  return {
    mode,
    fee,
    isFollowUp,
    standardFee: doctor.feeFor(mode) ?? fee,
    platformFee,
    total: fee + platformFee,
    durationMinutes: doctor.modes?.[mode]?.durationMinutes ?? 15,
  };
}

/**
 * Take one seat in a slot atomically; throws when the slot is full.
 *
 * The guard compares `booked` against the capacity passed in, not against the
 * stored `$capacity` field. Two reasons: the stored value is whatever applied
 * the first time anyone booked that slot, and the previous `$expr` form
 * (`$lt: ['$booked', ['$capacity']]`) compared a number against a one-element
 * array — under BSON type ordering a number always sorts below an array, so the
 * condition was unconditionally true and every slot accepted unlimited
 * bookings.
 */
async function takeSlot({ providerId, doctorId = null, date, time, capacity }) {
  const seats = Math.max(1, Number(capacity) || 1);
  const filter = { providerId, doctorId, date, time };
  await SlotBooking.updateOne(
    filter,
    { $setOnInsert: { ...filter, booked: 0 }, $set: { capacity: seats } },
    { upsert: true }
  );
  const res = await SlotBooking.updateOne(
    { ...filter, booked: { $lt: seats } },
    { $inc: { booked: 1 } }
  );
  if (res.modifiedCount === 0) {
    throw ApiError.badRequest('That slot just filled up — please pick another time');
  }
}

async function releaseSlot({ providerId, doctorId = null, date, time }) {
  await SlotBooking.updateOne(
    { providerId, doctorId, date, time, booked: { $gt: 0 } },
    { $inc: { booked: -1 } }
  );
}

/**
 * Build the priced booking skeleton per vertical. Every price comes from the
 * catalog; client numbers are never trusted.
 */
async function buildBooking(user, payload) {
  const { type } = payload;
  const base = {
    userId: user.id,
    type,
    schedule: {
      startDate: payload.schedule?.startDate || null,
      endDate: payload.schedule?.endDate || null,
      time: payload.schedule?.time || null,
      durationDays: payload.schedule?.durationDays || null,
    },
    visitType: payload.visitType || null,
    meta: payload.meta || {},
    items: [],
  };

  // Pet snapshot (optional for events/memorial)
  if (payload.petId) {
    const pet = await Pet.findOne({ _id: payload.petId, ownerId: user.id, deletedAt: null });
    if (!pet) throw ApiError.badRequest('Select a valid pet');
    base.petId = pet.id;
    base.petSnapshot = {
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      age: pet.age,
      avatar: pet.avatarUrl || pet.photos?.[0] || '',
    };
  }

  /*
   * `event` is handled further down, in the same `else if` chain.
   *
   * There used to be a second, earlier `if (type === 'event')` here that only
   * built the ticket line. Being first in the chain, it always won — so the
   * complete branch below was dead code and every ticket sale skipped the
   * atomic capacity guard, never incremented `sold`, never recorded
   * `meta.ticketQty`, and never charged the ₹49 platform fee the Review Booking
   * screen displays. Events oversold silently, the organiser's "tickets sold"
   * never moved, and a later cancellation decremented a counter that had never
   * gone up, driving `sold` negative.
   */
  if (type === 'daycare' || type === 'grooming') {
    const provider = await Provider.findOne({
      ...idOrLegacyFilter(payload.providerId),
      active: true,
    });
    if (!provider) throw ApiError.badRequest('Provider not found');
    base.providerId = provider.id;

    if (payload.addressId) {
      const address = await Address.findOne({ _id: payload.addressId, userId: user.id });
      if (!address) throw ApiError.badRequest('Select a valid address');
      base.addressId = address.id;
      base.addressSnapshot = {
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        locality: address.locality,
        city: address.city,
        pincode: address.pincode,
      };
    }

    base.items = await resolveOfferings(provider._id, type, payload.items);

    if (type === 'grooming') {
      // The price-summary screen shows a travel fee on home visits and a flat
      // promo discount. Both were display-only before, so the customer was
      // charged a different total than the one they approved. They are now
      // real, and the salon owns the numbers from its dashboard.
      const fees = groomingFeesFor(provider);
      if (base.visitType === 'home' && fees.travelFee > 0) {
        base.items.push({
          kind: 'fee', refId: null, name: 'Travel Fee', price: fees.travelFee, qty: 1,
        });
      }
      base._discount = Math.min(
        fees.discount,
        base.items.reduce((s, i) => s + i.price * i.qty, 0)
      );

      if (!base.schedule.startDate || !base.schedule.time) {
        throw ApiError.badRequest('Pick a date and time slot');
      }
      // Only times the salon actually publishes are bookable. Without this a
      // hand-crafted request could book any time string at all, and it would
      // show up on the vendor's day sheet as an appointment they never offered.
      const template = provider.details?.slotTemplate || [];
      if (!template.some((t) => t.time === base.schedule.time)) {
        throw ApiError.badRequest('That time is not available — please pick another slot');
      }
      await takeSlot({
        providerId: provider.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
        capacity: slotCapacity(provider, base.schedule.time),
      });
      base._slot = { providerId: provider.id, date: base.schedule.startDate, time: base.schedule.time };
    } else {
      /*
       * Daycare is boarding over a range of days, not an appointment at a time
       * — so it is priced and reserved per day, and `schedule.time` is just the
       * drop-off label.
       *
       * This branch used to be shared with grooming, which demanded a
       * `schedule.time` drawn from a slot template. Daycare centres have no
       * such template and the app never sent a time, so every single daycare
       * booking was rejected with "Pick a date and time slot".
       */
      const stayDates = daycareStayDates(payload, base.schedule);
      if (!stayDates.length) throw ApiError.badRequest('Pick at least one day');

      base.schedule.startDate = stayDates[0];
      base.schedule.endDate = stayDates.length > 1 ? stayDates[stayDates.length - 1] : null;
      base.schedule.durationDays = stayDates.length;
      base.meta.dates = stayDates;

      // A per-day plan or add-on costs its price once per booked day, which is
      // exactly what the price summary multiplies out.
      for (const item of base.items) {
        if (item.unit === 'day') item.qty = item.qty * stayDates.length;
      }

      const fees = daycareFeesFor(provider);
      if (fees.platformFee > 0) {
        base.items.push({
          kind: 'fee', refId: null, name: 'Platform Fee', price: fees.platformFee, qty: 1,
        });
      }
      base._discount = Math.min(
        fees.discount,
        base.items.reduce((s, i) => s + i.price * i.qty, 0)
      );

      // Hold a kennel place on every day of the stay. All-or-nothing: if the
      // centre is full on any one day, the days already taken are handed back
      // so a half-reserved stay can never exist.
      const capacity = daycareDailyCapacity(provider);
      const taken = [];
      try {
        for (const date of stayDates) {
          await takeSlot({ providerId: provider.id, date, time: DAY_SLOT, capacity });
          taken.push(date);
        }
      } catch (e) {
        for (const date of taken) {
          await releaseSlot({ providerId: provider.id, date, time: DAY_SLOT }).catch(() => {});
        }
        throw e;
      }
      base._daySlots = { providerId: provider.id, dates: stayDates };
    }
  } else if (type === 'doctor') {
    const doctor = await Doctor.findOne({
      ...idOrLegacyFilter(payload.doctorId, { numericLegacy: true }),
      active: true,
    });
    if (!doctor) throw ApiError.badRequest('Doctor not found');
    base.doctorId = doctor.id;

    const visitType = payload.visitType || 'clinic';
    const isInstant = visitType === 'instant_video' || visitType === 'instant';
    const mode = isInstant ? 'instantVideo' : modeForVisitType(visitType);
    if (!mode) throw ApiError.badRequest('Invalid consultation type');

    const offersMode = doctor.offersMode(mode) || (isInstant && doctor.offersMode('video'));
    if (!offersMode) {
      throw ApiError.badRequest(`${doctor.name} does not offer ${MODE_LABEL[mode]} appointments`);
    }

    if (PREPAID_MODES.has(mode) && payload.paymentMethod === 'pay_later') {
      throw ApiError.badRequest(
        `${MODE_LABEL[mode]} must be paid for in advance — pay-at-clinic is only available for in-person visits`
      );
    }

    let isFollowUp = false;
    let fee = 0;
    let durationMinutes = 15;
    // Declared out here because the capacity hold below needs it. It used to be
    // a `const` inside the scheduled-consult branch, so the later
    // `if (!isInstant && slot)` threw `ReferenceError: slot is not defined` —
    // every scheduled vet appointment failed with a 500.
    let slot = null;

    if (isInstant) {
      const now = new Date();
      const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      base.schedule.startDate = ymd;
      base.schedule.time = hhmm;
      base.schedule.startAt = now;
      durationMinutes = doctor.modes?.instantVideo?.durationMinutes || doctor.modes?.video?.durationMinutes || 15;
      fee = doctor.feeFor('instantVideo') ?? doctor.feeFor('video') ?? doctor.videoPrice ?? 499;
      base.visitType = 'video';
      base.consult = {
        mode: 'instantVideo',
        durationMinutes,
        isFollowUp: false,
      };
    } else {
      if (!base.schedule.startDate || !base.schedule.time) {
        throw ApiError.badRequest('Pick a date and time slot');
      }

      const { slots } = await getDoctorSlots({
        doctorId: doctor.id,
        date: base.schedule.startDate,
        visitType,
        includeFull: true,
      });
      slot = slots.find((s) => s.time === base.schedule.time);
      if (!slot) throw ApiError.badRequest('That time is not available — please pick another slot');
      if (!slot.available) throw ApiError.badRequest('That slot just filled up — please pick another time');

      // Same helper the checkout quotes from, so the two cannot drift.
      const quote = await quoteConsult({
        userId: user.id, doctor, mode, petId: base.petId, paymentMethod: payload.paymentMethod,
      });
      isFollowUp = quote.isFollowUp;
      fee = quote.fee;

      base.visitType = visitType;
      base.schedule.startAt = slot.startAt ? new Date(slot.startAt) : null;
      durationMinutes = slot.durationMinutes;
      base.consult = {
        mode,
        durationMinutes,
        isFollowUp,
      };
    }

    base.items = [
      {
        kind: 'consultation',
        refId: String(doctor.legacyId ?? doctor.id),
        name: `${isInstant ? 'Instant ' : isFollowUp ? 'Follow-up ' : ''}${MODE_LABEL[mode] || 'Video Consultation'} — ${doctor.name}`,
        price: fee,
        qty: 1,
      },
    ];

    if (payload.paymentMethod === 'razorpay') {
      base.items.push({
        kind: 'fee', refId: null, name: 'Platform Fee',
        price: PRICING_RULES.doctor.onlinePlatformFee, qty: 1,
      });
    }
    if (!isInstant && slot) {
      await takeSlot({
        providerId: doctor.providerId || doctor.id,
        doctorId: doctor.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
        capacity: slot.capacity || 1,
      });
      base._slot = {
        providerId: doctor.providerId || doctor.id,
        doctorId: doctor.id,
        date: base.schedule.startDate,
        time: base.schedule.time,
      };
    }
  } else if (type === 'event') {
    const event = await Event.findOne({
      ...idOrLegacyFilter(payload.eventId, { numericLegacy: true }),
      status: 'published',
    });
    if (!event) throw ApiError.badRequest('Event not found');
    const qty = Math.max(1, Math.min(10, payload.ticketQty || 1));

    // Atomic capacity guard on ticket sales.
    const res = await Event.updateOne(
      { _id: event.id, $expr: { $lte: [{ $add: ['$sold', qty] }, '$capacity'] } },
      { $inc: { sold: qty } }
    );
    if (res.modifiedCount === 0) throw ApiError.badRequest('Not enough tickets left');

    base.eventId = event.id;
    base.meta.ticketQty = qty;
    base._eventRelease = { eventId: event.id, qty };
    base.items = [
      { kind: 'ticket', refId: String(event.legacyId ?? event.id), name: event.title, price: event.price, qty },
    ];
    // The Review Booking screen displays a ₹49 platform fee; the quick ticket
    // sheet doesn't — the fee is charged only where the UI shows it.
    if (payload.meta?.withPlatformFee && event.price > 0) {
      base.items.push({ kind: 'fee', refId: null, name: 'Platform Fee', price: 49, qty: 1 });
    }
  } else if (type === 'memorial') {
    // Callback request — free, confirmed immediately.
    if (!payload.meta?.contact?.phone) throw ApiError.badRequest('A contact number is required');
    base.items = [{ kind: 'package', refId: null, name: 'Memorial Support Callback', price: 0, qty: 1 }];
  }

  const isAddonKind = (k) => k === 'addon' || k === 'menu_item';
  const baseAmount = toPaise(
    base.items.filter((i) => !isAddonKind(i.kind)).reduce((s, i) => s + i.price * i.qty, 0)
  );
  const addonAmount = toPaise(
    base.items.filter((i) => isAddonKind(i.kind)).reduce((s, i) => s + i.price * i.qty, 0)
  );
  const discount = toPaise(base._discount || 0);
  delete base._discount;
  base.amounts = {
    base: baseAmount,
    addons: addonAmount,
    discount,
    tax: 0, // booking flows display no extra tax in the mock UI
    total: Math.max(0, baseAmount + addonAmount - discount),
  };
  return base;
}

/** Roll back whatever capacity the failed/cancelled booking held. */
export async function releaseCapacity(booking) {
  // Daycare holds one place per day of the stay, so cancelling has to hand back
  // every one of them — releasing only the start date would leak capacity for
  // the rest of the stay and slowly make the centre look permanently full.
  if (booking.type === 'daycare' && booking.providerId) {
    const dates = booking._daySlots?.dates?.length
      ? booking._daySlots.dates
      : booking.meta?.dates?.length
        ? booking.meta.dates
        : [booking.schedule?.startDate].filter(Boolean);
    for (const date of dates) {
      await releaseSlot({ providerId: booking.providerId, date, time: DAY_SLOT }).catch(() => {});
    }
    return;
  }

  if (booking._slot || (booking.schedule?.time && (booking.providerId || booking.doctorId))) {
    const slot = booking._slot || {
      providerId: booking.doctorId ? (await Doctor.findById(booking.doctorId))?.providerId || booking.doctorId : booking.providerId,
      doctorId: booking.doctorId || null,
      date: booking.schedule.startDate,
      time: booking.schedule.time,
    };
    if (slot.providerId && slot.date && slot.time) await releaseSlot(slot);
  }
  if (booking.type === 'event' && booking.eventId) {
    const qty = booking.meta?.ticketQty || 1;
    await Event.updateOne({ _id: booking.eventId }, { $inc: { sold: -qty } });
  }
}

/** POST /bookings — creates the booking; Razorpay bookings await payment. */
export async function createBooking(user, payload) {
  const draft = await buildBooking(user, payload);
  const isFree = draft.amounts.total === 0;
  const isInstant = draft.visitType === 'instant_video' || draft.consult?.mode === 'instantVideo';
  const paymentMethod = isFree ? 'free' : payload.paymentMethod;
  const autoConfirm = paymentMethod !== 'razorpay' || isInstant;

  const booking = await Booking.create({
    ...draft,
    paymentMethod,
    status: autoConfirm ? 'confirmed' : 'pending_payment',
    timeline: [
      {
        status: autoConfirm ? 'confirmed' : 'pending_payment',
        note: autoConfirm ? 'Booking created' : 'Awaiting payment',
      },
    ],
  });

  if (autoConfirm) {
    await notifyBookingConfirmed(booking);
    return { booking };
  }

  const payment = await createPaymentOrder(user, 'booking', { bookingId: booking.id });
  booking.paymentId = payment.paymentId;
  await booking.save();
  return { booking, razorpay: payment };
}

/**
 * Credit the earning vendor when a booking is paid, so it shows up in their
 * ledger, dashboard totals and payout requests. Best-effort — a ledger hiccup
 * must never bounce the Razorpay webhook into a retry loop.
 *
 * Resolves the vendor per vertical: events pay the organizer, doctor
 * consultations pay the clinic that owns the vet.
 */
async function recordBookingLedger(booking) {
  if (!booking.amounts?.total) return;
  try {
    const { postLedgerEntry } = await import('../vendor/vendor.service.js');
    const { VendorProfile } = await import('../vendor/vendor.models.js');

    let vendorId = null;
    let label = '';

    if (booking.type === 'event' && booking.eventId) {
      const event = await Event.findById(booking.eventId).select('vendorId');
      vendorId = event?.vendorId || null;
      label = `Event booking ${booking.bookingNo}`;
    } else if (booking.type === 'doctor' && booking.doctorId) {
      // Consultation revenue belongs to the clinic that owns the vet.
      const doctor = await Doctor.findById(booking.doctorId).select('clinicVendorId name');
      vendorId = doctor?.clinicVendorId || null;
      const kind = MODE_LABEL[booking.consult?.mode] || 'Consultation';
      label = `${kind} ${booking.bookingNo}${doctor?.name ? ` — ${doctor.name}` : ''}`;
    } else if ((booking.type === 'grooming' || booking.type === 'daycare') && booking.providerId) {
      const provider = await Provider.findById(booking.providerId).select('vendorUserId name');
      vendorId = provider?.vendorUserId || null;
      const kind = booking.type === 'grooming' ? 'Grooming' : 'Daycare';
      label = `${kind} booking ${booking.bookingNo}${provider?.name ? ` — ${provider.name}` : ''}`;
    }

    if (!vendorId) return;
    const profile = await VendorProfile.findOne({ userId: vendorId });
    await postLedgerEntry({
      vendorId,
      refType: 'booking',
      refId: booking._id,
      label,
      gross: booking.amounts.total,
      commissionRate: profile?.commissionRate ?? 0.15,
    });
  } catch {
    // ledger is best-effort
  }
}

/** In-app + push notification for a confirmed booking. Best-effort. */
async function notifyBookingConfirmed(booking) {
  await notify(booking.userId, {
    title: 'Booking Confirmed',
    body: `Your ${booking.type || 'appointment'} booking is confirmed.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: booking.type || '' },
  }).catch(() => {});

  // Also tell the vet whose calendar just filled up — the dashboard's
  // notification bell was previously always empty because nothing here ever
  // notified the vendor side of a new booking.
  if (booking.type === 'doctor' && booking.doctorId) {
    const doctor = await Doctor.findById(booking.doctorId).select('userId name');
    if (doctor?.userId) {
      await notify(doctor.userId, {
        title: 'New Appointment',
        body: `${booking.petSnapshot?.name ? `${booking.petSnapshot.name}'s` : 'A'} appointment was just booked for ${booking.schedule?.startDate || 'soon'}${booking.schedule?.time ? ` at ${booking.schedule.time}` : ''}.`,
        type: 'booking',
        link: '/vendor/doctor/consultations?view=appointments_list',
        data: { bookingId: String(booking._id), type: 'doctor' },
      }).catch(() => {});
    }
  }

  // Same for the salon / centre whose calendar just filled up — without this
  // the only way a grooming vendor learned about an appointment was by
  // refreshing their bookings tab.
  if ((booking.type === 'grooming' || booking.type === 'daycare') && booking.providerId) {
    const provider = await Provider.findById(booking.providerId).select('vendorUserId');
    if (provider?.vendorUserId) {
      const when = `${booking.schedule?.startDate || 'soon'}${booking.schedule?.time ? ` at ${booking.schedule.time}` : ''}`;
      await notify(provider.vendorUserId, {
        title: booking.type === 'grooming' ? 'New Grooming Appointment' : 'New Daycare Booking',
        body: `${booking.petSnapshot?.name ? `${booking.petSnapshot.name}'s` : 'A'} ${
          booking.visitType === 'home' ? 'home visit' : 'appointment'
        } was just booked for ${when}.`,
        type: 'booking',
        link: `/vendor/${booking.type === 'grooming' ? 'grooming' : 'daycare'}-provider?view=bookings`,
        data: { bookingId: String(booking._id), type: booking.type },
      }).catch(() => {});
    }
  }
}

registerPurposeHandler('booking', {
  computeAmount: async (user, payload) => {
    const booking = await Booking.findOne({
      _id: payload.bookingId,
      userId: user.id,
      status: 'pending_payment',
    });
    if (!booking) throw ApiError.badRequest('Booking not found or already paid');
    return { amountPaise: booking.amounts.total, refId: booking.id };
  },
  onPaid: async (payment) => {
    const res = await Booking.findOneAndUpdate(
      { _id: payment.refId, status: 'pending_payment' },
      {
        $set: { status: 'confirmed', paymentId: payment.id },
        $push: { timeline: { status: 'confirmed', note: 'Payment received' } },
      },
      { new: true }
    );
    if (res) {
      await notifyBookingConfirmed(res);
      await recordBookingLedger(res);
    }
  },
  onFailed: async (payment) => {
    await Booking.updateOne(
      { _id: payment.refId, status: 'pending_payment' },
      { $push: { timeline: { status: 'pending_payment', note: 'Payment failed — retry available' } } }
    );
  },
});

export async function listBookings(userId, type) {
  const filter = { userId };
  if (type) filter.type = type;
  return Booking.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('providerId', 'name image type')
    .populate('doctorId', 'name clinic img')
    .populate('eventId', 'title img location timeText');
}

export async function getBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId })
    .populate('providerId', 'name image type details openTime closeTime cancellationPolicy')
    .populate('doctorId', 'name clinic img spec location')
    .populate('eventId', 'title img location timeText dateDay monthText');
  if (!booking) throw ApiError.notFound('Booking not found');
  return booking;
}

/** Cancel within policy; paid bookings auto-refund and capacity is released. */
export async function cancelBooking(userId, bookingId) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking can no longer be cancelled');
  }

  const wasConfirmed = booking.status === 'confirmed';

  // Doctor bookings follow the vet's own free-cancellation window. Cancelling
  // inside it still releases the slot, but forfeits the refund.
  let refundable = true;
  if (booking.type === 'doctor' && booking.doctorId && booking.schedule?.startAt) {
    const doctor = await Doctor.findById(booking.doctorId).select('policies name');
    const hours = doctor?.policies?.cancellationHours ?? 4;
    const hoursToStart = (new Date(booking.schedule.startAt) - Date.now()) / 3_600_000;
    if (hoursToStart < hours) {
      refundable = false;
      booking.timeline.push({
        status: 'cancelled',
        note: `Cancelled inside the ${hours}h free-cancellation window — not refundable`,
      });
    }
  }

  await releaseCapacity(booking);

  if (refundable && wasConfirmed && booking.paymentMethod === 'razorpay' && booking.paymentId) {
    const payment = await Payment.findById(booking.paymentId);
    if (payment?.status === 'paid' && payment.razorpayPaymentId) {
      await refundPayment(payment.razorpayPaymentId);
      payment.status = 'refunded';
      payment.refundedAmount = payment.amount;
      await payment.save();
      booking.timeline.push({ status: 'refunded', note: 'Refund initiated to source' });
    }
  }

  booking.status = 'cancelled';
  booking.timeline.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await booking.save();
  return booking;
}

/**
 * Move a daycare/grooming booking to a new date/time — the "Reschedule"
 * button in MyBookingDetail.jsx used to only rewrite a localStorage copy.
 * Doctor/event bookings aren't supported here yet (different slot model).
 */
export async function rescheduleBooking(userId, bookingId, { date, time }) {
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status)) {
    throw ApiError.badRequest('This booking can no longer be rescheduled');
  }
  if (!['daycare', 'grooming'].includes(booking.type) || !booking.providerId) {
    throw ApiError.badRequest('Rescheduling is not supported for this booking type');
  }

  const oldDate = booking.schedule.startDate;
  const oldTime = booking.schedule.time;
  if (oldDate === date && oldTime === time) return booking;

  const provider = await Provider.findById(booking.providerId).select('details');

  // Daycare moves the whole stay: same number of days, new start date, and the
  // centre has to have room on every one of the new days.
  if (booking.type === 'daycare') {
    const oldDates = booking.meta?.dates?.length ? booking.meta.dates : [oldDate].filter(Boolean);
    const shiftDays = Math.max(1, Number(booking.schedule.durationDays) || oldDates.length || 1);
    const start = parseYMD(date);
    if (Number.isNaN(start.getTime())) throw ApiError.badRequest('Pick a valid date');

    const newDates = Array.from({ length: shiftDays }, (_, i) =>
      formatYMD(new Date(start.getTime() + i * 86_400_000))
    );

    const capacity = daycareDailyCapacity(provider);
    const taken = [];
    try {
      for (const d of newDates) {
        // Days the stay already holds are kept, not double-counted.
        if (oldDates.includes(d)) continue;
        await takeSlot({ providerId: booking.providerId, date: d, time: DAY_SLOT, capacity });
        taken.push(d);
      }
    } catch (e) {
      for (const d of taken) {
        await releaseSlot({ providerId: booking.providerId, date: d, time: DAY_SLOT }).catch(() => {});
      }
      throw e;
    }

    for (const d of oldDates) {
      if (newDates.includes(d)) continue;
      await releaseSlot({ providerId: booking.providerId, date: d, time: DAY_SLOT }).catch(() => {});
    }

    booking.schedule.startDate = newDates[0];
    booking.schedule.endDate = newDates.length > 1 ? newDates[newDates.length - 1] : null;
    if (time) booking.schedule.time = time;
    booking.meta = { ...(booking.meta || {}), dates: newDates };
    booking.markModified('meta');
    booking.timeline.push({ status: booking.status, note: `Stay moved to ${newDates[0]}` });
    await booking.save();
    return booking;
  }

  // The new time has to be one the provider actually offers, otherwise a
  // reschedule was a way to book a slot that never appears on the calendar.
  const template = provider?.details?.slotTemplate || [];
  if (!template.some((t) => t.time === time)) {
    throw ApiError.badRequest('That time is not offered — please pick another slot');
  }
  await takeSlot({
    providerId: booking.providerId,
    date,
    time,
    capacity: slotCapacity(provider, time),
  });
  if (oldDate && oldTime) {
    await releaseSlot({ providerId: booking.providerId, date: oldDate, time: oldTime }).catch(() => {});
  }

  booking.schedule.startDate = date;
  booking.schedule.time = time;
  booking.timeline.push({ status: booking.status, note: `Rescheduled to ${date} ${time}` });
  await booking.save();
  return booking;
}

/**
 * Slot availability for a **provider** (daycare / grooming) on a date, from its
 * `details.slotTemplate` blob. Returns a bare array — the grooming booking
 * screen consumes it directly.
 *
 * Doctors do NOT come through here: vet slots are generated from the vet's own
 * working days, blocks and consult duration by
 * `provider/availability.service.js → getDoctorSlots()`.
 */
/**
 * Day-by-day availability for a daycare centre, over `days` starting at `from`.
 *
 * Daycare has no slot template — a day is either under the centre's daily
 * capacity or it is full — so the booking calendar needs this rather than
 * `getSlots`, which would return an empty array for every centre.
 */
export async function getDayAvailability({ providerId, from, days = 60 }) {
  const provider = await Provider.findOne({ ...idOrLegacyFilter(providerId), active: true });
  if (!provider) throw ApiError.notFound('Provider not found');

  const span = Math.max(1, Math.min(120, Number(days) || 60));
  const start = parseYMD(from);
  if (Number.isNaN(start.getTime())) throw ApiError.badRequest('from=YYYY-MM-DD is required');

  const dates = Array.from({ length: span }, (_, i) =>
    formatYMD(new Date(start.getTime() + i * 86_400_000))
  );

  const counters = await SlotBooking.find({
    providerId: provider.id,
    doctorId: null,
    time: DAY_SLOT,
    date: { $in: dates },
  });
  const booked = new Map(counters.map((c) => [c.date, c.booked]));
  const capacity = daycareDailyCapacity(provider);

  return {
    capacity,
    days: dates.map((date) => {
      const used = booked.get(date) || 0;
      return { date, capacity, booked: used, available: used < capacity };
    }),
  };
}

export async function getSlots({ providerId, date }) {
  const provider = await Provider.findOne({ ...idOrLegacyFilter(providerId), active: true });
  if (!provider) throw ApiError.notFound('Provider not found');
  const template = provider.details?.slotTemplate || [];

  const counters = await SlotBooking.find({ providerId: provider.id, doctorId: null, date });
  const byTime = new Map(counters.map((c) => [c.time, c]));

  return template.map((t) => {
    const counter = byTime.get(t.time);
    // Capacity comes from the live template, not the counter row: a counter is
    // stamped with whatever capacity applied when it was first created, so
    // reading it back would freeze a salon at its old capacity forever.
    const capacity = slotCapacity(provider, t.time);
    const booked = counter?.booked || 0;
    return {
      time: t.time,
      period: t.period,
      capacity,
      booked,
      available: booked < capacity,
    };
  });
}
