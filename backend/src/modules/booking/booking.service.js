import { ApiError } from '../../utils/ApiError.js';
import { notify } from '../../services/notify.js';
import { createWithUniqueRef } from '../../utils/uniqueRef.js';
import {
  registerPurposeHandler,
  createOrder as createPaymentOrder,
} from '../payment/payment.service.js';
import { Payment } from '../payment/payment.model.js';
import { issueRefund } from '../payment/refund.service.js';
import { recordViolation, getPolicy } from '../compliance/compliance.service.js';
import { alertVendor, resolveVendorAlert } from '../../services/vendorAlert.js';
import { Provider } from '../provider/provider.model.js';
import { ServiceOffering } from '../provider/serviceOffering.model.js';
import { Doctor, modeForVisitType } from '../provider/doctor.model.js';
import { getDoctorSlots } from '../provider/availability.service.js';
import { Event } from '../provider/event.model.js';
import { Pet } from '../pet/pet.model.js';
import { isReactive } from '../social/behaviour.service.js';
import { assertVendorOnline } from '../vendor/availability.service.js';

/** Kept in step with events.vendor.service.js, which reads them back. */
const TRAINER_ITEM_REF = 'trainer_support';
const TRAINER_ITEM_NAME = 'Trainer / handler support';

/**
 * Keys under `meta` that only the server may write.
 *
 * `meta` is a free-form bag so each vertical can stash its own answers, and it
 * is copied verbatim from the request. That is fine for questionnaire replies,
 * but several keys are read back as though the server had set them: a client
 * posting `{ withTrainer: true }` got "Trainer paid" on the organiser's list
 * and a notification telling them to arrange a handler, without paying for
 * one, and `{ checkedIn: true }` marked its own ticket as admitted.
 */
const SERVER_OWNED_META = ['withTrainer', 'reactivePet', 'checkedIn', 'ticketQty'];

function sanitiseClientMeta(meta) {
  const clean = { ...(meta || {}) };
  for (const key of SERVER_OWNED_META) delete clean[key];
  return clean;
}
import { Address } from '../address/address.model.js';
import { SlotBooking } from './slot.model.js';
import { Booking, CANCELLABLE_BOOKING_STATUSES, canTransition } from './booking.model.js';

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
    meta: sanitiseClientMeta(payload.meta),
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
    /*
     * The listing already hides a closed business, so getting here means a
     * stale tab, a saved link, or a booking begun in the seconds after they
     * switched off. Refuse it rather than book someone into a shut salon.
     */
    await assertVendorOnline(provider.vendorUserId, provider.name || 'This provider');
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
    await assertVendorOnline(doctor.userId, doctor.name ? `Dr ${doctor.name}` : 'This vet');
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
    await assertVendorOnline(event.vendorId, 'This organiser');
    const qty = Math.max(1, Math.min(10, payload.ticketQty || 1));

    /*
     * Handler support.
     *
     * Purely optional, and purely the organiser's service: the platform does
     * not supply, roster or hold places for trainers. If the owner opts in,
     * the fee rides along with the ticket to the organiser and the organiser
     * is told the booking includes a handler. Nothing here blocks a sale — an
     * owner who declines still gets their ticket, having been shown where the
     * responsibility sits.
     *
     * Priced per pet needing supervision, and a booking names exactly one pet,
     * so the quantity is one however many tickets are bought — the extra
     * tickets are the humans coming along.
     */
    const trainer = event.trainer || {};
    const offersTrainer = trainer.provision === 'included' || trainer.provision === 'paid';
    const wantsTrainer = Boolean(payload.withTrainer);
    /*
     * Fail rather than quietly book them in without it.
     *
     * The owner ticked a box, saw the fee in their total, and is expecting a
     * handler to be there. If the organiser has withdrawn the service since
     * the sheet was opened, silently dropping it charges the right amount but
     * leaves them believing supervision is arranged -- which is exactly the
     * situation this whole feature exists to avoid.
     */
    if (wantsTrainer && !offersTrainer) {
      throw ApiError.badRequest(
        'This event no longer offers trainer support. Reopen the event to book without it.'
      );
    }

    // Reclaim seats from checkouts nobody finished, so an event does not read
    // as sold out on the strength of abandoned Razorpay windows.
    await releaseStaleTicketHolds(event.id).catch(() => {});

    // Atomic capacity guard on ticket sales.
    const res = await Event.updateOne(
      { _id: event.id, $expr: { $lte: [{ $add: ['$sold', qty] }, '$capacity'] } },
      { $inc: { sold: qty } }
    );
    if (res.modifiedCount === 0) throw ApiError.badRequest('Not enough tickets left');

    base.eventId = event.id;
    base.meta.ticketQty = qty;
    base.items = [
      { kind: 'ticket', refId: String(event.legacyId ?? event.id), name: event.title, price: event.price, qty },
    ];

    if (wantsTrainer) {
      base.meta.withTrainer = true;
      base.items.push({
        kind: 'addon',
        // A stable handle. The organiser's receipt used to find this line by
        // its display name, so renaming the label would have silently zeroed
        // the fee on every booking already taken.
        refId: TRAINER_ITEM_REF,
        name: TRAINER_ITEM_NAME,
        // An included handler is still a line item, so the ticket and the
        // organiser's attendee list both show one was booked.
        price: trainer.provision === 'paid' ? trainer.pricePerPet : 0,
        qty: 1,
      });
    }

    /*
     * Record a reactive pet either way.
     *
     * The owner is shown at checkout that responsibility for any incident is
     * theirs, not the platform's or the organiser's; storing the traits and
     * whether they took a handler is what makes that claim evidenced rather
     * than asserted, and it puts the pet on the organiser's list before the
     * day rather than at the gate.
     */
    // Read the stored pet, never a flag from the client.
    const petTraits = base.petId
      ? (await Pet.findById(base.petId).select('temperament').lean())?.temperament || []
      : [];
    if (isReactive(petTraits)) {
      base.meta.reactivePet = {
        traits: petTraits,
        handlerBooked: wantsTrainer,
        // The disclaimer the owner passed through on their way here.
        acknowledgedAt: new Date(),
      };
    }

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

/**
 * How long an unpaid ticket keeps holding its seat.
 *
 * Capacity is claimed when the booking is created, before payment, so the
 * ticket cannot be sold out from under someone mid-checkout. Nothing ever gave
 * it back though: a closed Razorpay window left `sold` incremented for good,
 * and a popular event drifted towards a permanent phantom "Fully Booked".
 * Releasing on payment failure is not the fix -- that path deliberately leaves
 * the booking retryable, and releasing there would let the retry oversell.
 */
const PENDING_TICKET_TTL_MS = 30 * 60 * 1000;

/**
 * Hand back seats held by checkouts that were never completed.
 *
 * Lazy rather than scheduled: it runs just before a new sale on the same
 * event, which is exactly when a stale hold matters and keeps the work
 * proportional to demand. Each row is claimed with a conditional update, so
 * two simultaneous buyers cannot both release the same booking and drive
 * `sold` below what is genuinely sold.
 */
async function releaseStaleTicketHolds(eventId) {
  const cutoff = new Date(Date.now() - PENDING_TICKET_TTL_MS);
  const stale = await Booking.find({
    type: 'event',
    eventId,
    status: 'pending_payment',
    createdAt: { $lt: cutoff },
  })
    .select('meta')
    .limit(50)
    .lean();
  if (!stale.length) return;

  let released = 0;
  for (const row of stale) {
    const claimed = await Booking.findOneAndUpdate(
      { _id: row._id, status: 'pending_payment' },
      {
        $set: { status: 'cancelled' },
        $push: { timeline: { status: 'cancelled', note: 'Checkout not completed - ticket released' } },
      }
    );
    if (claimed) released += claimed.meta?.ticketQty || 1;
  }

  if (released) {
    await Event.updateOne({ _id: eventId }, { $inc: { sold: -released } });
    // Never let a double-release push the counter negative; a negative `sold`
    // would silently raise the event's effective capacity.
    await Event.updateOne({ _id: eventId, sold: { $lt: 0 } }, { $set: { sold: 0 } });
  }
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

  const booking = await createWithUniqueRef(
    Booking,
    {
      ...draft,
      paymentMethod,
      status: autoConfirm ? 'confirmed' : 'pending_payment',
      timeline: [
        {
          status: autoConfirm ? 'confirmed' : 'pending_payment',
          note: autoConfirm ? 'Booking created' : 'Awaiting payment',
          by: 'customer',
          byId: user?.id || null,
          byName: user?.name || '',
        },
      ],
    },
    'bookingNo'
  );

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
/**
 * Which partner account earns a booking, which business line it belongs to,
 * and how to label it on their ledger.
 *
 * Split out of `recordBookingLedger` because cancellation, acceptance and
 * Admin overrides all need to reach the same vendor. It previously existed
 * only inside the ledger path, which is why nothing outside settlement could
 * notify the partner that their booking had changed.
 */
export async function resolveBookingVendor(booking) {
  if (booking.type === 'event' && booking.eventId) {
    const event = await Event.findById(booking.eventId).select('vendorId');
    return {
      vendorId: event?.vendorId || null,
      vendorType: 'events',
      label: `Event booking ${booking.bookingNo}`,
    };
  }
  if (booking.type === 'doctor' && booking.doctorId) {
    // Consultation revenue belongs to the clinic that owns the vet.
    const doctor = await Doctor.findById(booking.doctorId).select('clinicVendorId name');
    const kind = MODE_LABEL[booking.consult?.mode] || 'Consultation';
    return {
      vendorId: doctor?.clinicVendorId || null,
      vendorType: 'clinic',
      label: `${kind} ${booking.bookingNo}${doctor?.name ? ` — ${doctor.name}` : ''}`,
    };
  }
  if ((booking.type === 'grooming' || booking.type === 'daycare') && booking.providerId) {
    const provider = await Provider.findById(booking.providerId).select('vendorUserId name');
    const kind = booking.type === 'grooming' ? 'Grooming' : 'Daycare';
    return {
      vendorId: provider?.vendorUserId || null,
      vendorType: booking.type,
      label: `${kind} booking ${booking.bookingNo}${provider?.name ? ` — ${provider.name}` : ''}`,
    };
  }
  return { vendorId: null, vendorType: null, label: '' };
}

/** Just the earning account, for notifications. */
export async function resolveBookingVendorId(booking) {
  const { vendorId } = await resolveBookingVendor(booking);
  return vendorId;
}

async function recordBookingLedger(booking) {
  if (!booking.amounts?.total) return;
  try {
    const { postLedgerEntry, commissionFor } = await import('../vendor/vendor.service.js');

    // Which of the vendor's business lines earned this booking. One account can
    // run grooming AND daycare at different commission rates, so settling both
    // at "the vendor's rate" would silently pay one of them wrong.
    const { vendorId, vendorType, label } = await resolveBookingVendor(booking);

    if (!vendorId) return;
    const commissionRate = await commissionFor(vendorId, vendorType);
    await postLedgerEntry({
      vendorId,
      refType: 'booking',
      refId: booking._id,
      label,
      gross: booking.amounts.total,
      commissionRate,
      vendorType,
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

  /*
   * The partner side rings rather than just filing a notification.
   *
   * Each vertical already had a `notify()` here, added because the partner
   * dashboards' notification bells were permanently empty. But a bell badge
   * still relies on the partner happening to look: a booking made for this
   * afternoon needs them to know NOW. `alertVendor` fires the same durable
   * notification AND rings the open panel until it is acknowledged.
   */
  const when = `${booking.schedule?.startDate || 'soon'}${booking.schedule?.time ? ` at ${booking.schedule.time}` : ''}`;
  const pet = booking.petSnapshot?.name;

  if (booking.type === 'doctor' && booking.doctorId) {
    const doctor = await Doctor.findById(booking.doctorId).select('userId name');
    if (doctor?.userId) {
      await alertVendor(doctor.userId, {
        kind: 'booking_confirmed',
        title: 'New Appointment',
        body: `${pet ? `${pet}'s` : 'An'} appointment was just booked for ${when}.`,
        link: '/vendor/doctor/consultations?view=appointments_list',
        refId: booking._id,
        refLabel: booking.bookingNo,
        data: { bookingId: String(booking._id), type: 'doctor' },
      });
    }
  }

  /*
   * Events had no vendor notification at all, which matters more now: a
   * handler the owner has already paid for is something the organiser has to
   * arrange, and they cannot arrange it if they only find out by refreshing a
   * bookings tab.
   */
  if (booking.type === 'event' && booking.eventId) {
    const event = await Event.findById(booking.eventId).select('vendorId title');
    if (event?.vendorId) {
      const parts = [`${pet ? `${pet} is` : 'Someone is'} coming to ${event.title}.`];
      if (booking.meta?.withTrainer) {
        parts.push('Handler support booked and paid for — please arrange a trainer.');
      } else if (booking.meta?.reactivePet) {
        parts.push('This pet is marked reactive and no handler was booked.');
      }
      await alertVendor(event.vendorId, {
        kind: 'booking_confirmed',
        title: booking.meta?.withTrainer ? 'New Booking — Handler Requested' : 'New Event Booking',
        body: parts.join(' '),
        link: '/vendor/events-organizer/bookings',
        refId: booking._id,
        refLabel: booking.bookingNo,
        data: { bookingId: String(booking._id), type: 'event' },
      });
    }
  }

  if ((booking.type === 'grooming' || booking.type === 'daycare') && booking.providerId) {
    const provider = await Provider.findById(booking.providerId).select('vendorUserId');
    if (provider?.vendorUserId) {
      await alertVendor(provider.vendorUserId, {
        kind: 'booking_confirmed',
        title: booking.type === 'grooming' ? 'New Grooming Appointment' : 'New Daycare Booking',
        body: `${pet ? `${pet}'s` : 'An'} ${
          booking.visitType === 'home' ? 'home visit' : 'appointment'
        } was just booked for ${when}.`,
        link: `/vendor/${booking.type === 'grooming' ? 'grooming' : 'daycare'}-provider?view=bookings`,
        refId: booking._id,
        refLabel: booking.bookingNo,
        data: { bookingId: String(booking._id), type: booking.type },
      });
    }
  }
}

registerPurposeHandler('booking', {
  computeAmount: async (user, payload) => {
    const booking = await Booking.findOne({
      _id: payload.bookingId,
      userId: user.id,
      // `payment_failed` is retryable — a declined card is the commonest reason
      // a customer comes back, and refusing the retry would strand the booking.
      status: { $in: ['pending_payment', 'payment_failed'] },
    });
    if (!booking) throw ApiError.badRequest('Booking not found or already paid');
    return { amountPaise: booking.amounts.total, refId: booking.id };
  },
  onPaid: async (payment) => {
    /*
     * Where a paid booking lands depends on whether the partner has opted
     * into manually accepting work. Opt-in, and defaulting to off, so every
     * existing partner keeps auto-confirming exactly as before — this adds the
     * accept/reject capability the ecosystem was missing without silently
     * parking live bookings in a state no current panel renders.
     */
    const pending = await Booking.findById(payment.refId);
    if (!pending || !['pending_payment', 'payment_failed'].includes(pending.status)) return;

    const needsAccept = await bookingNeedsAcceptance(pending);
    const nextStatus = needsAccept ? 'awaiting_vendor' : 'confirmed';

    const res = await Booking.findOneAndUpdate(
      { _id: payment.refId, status: { $in: ['pending_payment', 'payment_failed'] } },
      {
        $set: {
          status: nextStatus,
          paymentId: payment.id,
          ...(needsAccept ? { vendorRespondBy: new Date(Date.now() + VENDOR_RESPONSE_WINDOW_MS) } : {}),
        },
        $push: {
          timeline: {
            status: nextStatus,
            note: needsAccept ? 'Payment received - awaiting partner acceptance' : 'Payment received',
            by: 'system',
          },
        },
      },
      { new: true }
    );
    if (!res) return;

    /*
     * The ledger is posted on payment, not on acceptance. That is deliberate:
     * the money is genuinely held, and a later rejection posts a reversal
     * through the refund path rather than leaving a gap in the audit trail.
     */
    await recordBookingLedger(res);
    if (needsAccept) await notifyBookingAwaitingVendor(res);
    else await notifyBookingConfirmed(res);
  },
  onFailed: async (payment) => {
    /*
     * `payment_failed` rather than another `pending_payment` timeline note.
     * Admin could not previously separate "customer never paid" from "the
     * customer's payment was declined" — different problems with different
     * follow-ups, and the second is a conversion leak worth seeing.
     */
    await Booking.updateOne(
      { _id: payment.refId, status: 'pending_payment' },
      {
        $set: { status: 'payment_failed' },
        $push: {
          timeline: {
            status: 'payment_failed',
            note: `Payment failed${payment.failureReason ? `: ${payment.failureReason}` : ''} - retry available`,
            by: 'system',
          },
        },
      }
    );
  },
});

/** How long a partner has to answer a booking request before it auto-declines. */
export const VENDOR_RESPONSE_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Whether this booking's partner has opted into manually accepting work.
 * Off unless explicitly configured, so nothing changes for existing partners.
 */
async function bookingNeedsAcceptance(booking) {
  try {
    if (booking.type === 'grooming' || booking.type === 'daycare') {
      const provider = await Provider.findById(booking.providerId).select('details');
      return provider?.details?.requiresAcceptance === true;
    }
    if (booking.type === 'doctor') {
      const doctor = await Doctor.findById(booking.doctorId).select('policies');
      return doctor?.policies?.requiresAcceptance === true;
    }
    return false; // events and memorials are sold against published capacity
  } catch {
    return false;
  }
}

async function notifyBookingAwaitingVendor(booking) {
  await notify(booking.userId, {
    title: 'Booking requested',
    body: `Your ${booking.type || 'booking'} request has been sent to the partner for confirmation.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: booking.type || '' },
  }).catch(() => {});

  const vendorId = await resolveBookingVendorId(booking);
  if (vendorId) {
    /*
     * Rings the partner panel rather than adding a silent row. They have a hard
     * deadline here — miss it and the booking auto-declines, the customer is
     * refunded and the partner takes a compliance hit — so the alert has to be
     * impossible to overlook.
     */
    await alertVendor(vendorId, {
      kind: 'booking_request',
      title: 'New booking request',
      body: `${serviceLabel(booking)} · ${booking.schedule?.startDate || 'date TBC'} ${booking.schedule?.time || ''} — respond within 2 hours or it is auto-declined.`,
      link: '/vendor/bookings',
      refId: booking._id,
      refLabel: booking.bookingNo,
      expiresAt: booking.vendorRespondBy,
      data: { bookingId: String(booking._id), action: 'respond' },
    });
  }
}

/** Human label for a booking, for alert copy. */
function serviceLabel(booking) {
  const map = { grooming: 'Grooming', daycare: 'Day care', doctor: 'Consultation', event: 'Event', memorial: 'Memorial' };
  return map[booking.type] || 'Booking';
}

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

/**
 * Cancel within policy; paid bookings auto-refund and capacity is released.
 *
 * Shared by the customer's own cancel, a partner dropping out, and an Admin
 * override, because all three must leave identical state behind — the previous
 * customer-only path was the only one that existed, so a vendor cancellation
 * had nowhere to be recorded and Admin could not cancel at all.
 */
export async function cancelBooking(userId, bookingId, options = {}) {
  const query = userId ? { _id: bookingId, userId } : { _id: bookingId };
  const booking = await Booking.findOne(query);
  if (!booking) throw ApiError.notFound('Booking not found');
  if (!CANCELLABLE_BOOKING_STATUSES.includes(booking.status) && !options.force) {
    throw ApiError.badRequest('This booking can no longer be cancelled');
  }
  return performCancellation(booking, {
    by: 'customer',
    reason: 'Cancelled by customer',
    ...options,
  });
}

/* ── Partner acceptance ──────────────────────────────────────────── */

/**
 * Partner accepts a booking that was waiting on them.
 *
 * Only reachable from `awaiting_vendor`; bookings on auto-confirm verticals
 * never enter that state and are already `confirmed`.
 */
export async function vendorAcceptBooking(vendorUserId, bookingId, { note = '', actor = null } = {}) {
  const booking = await loadVendorBooking(vendorUserId, bookingId);
  if (booking.status !== 'awaiting_vendor') {
    throw ApiError.badRequest(`Booking is ${booking.status} and is not awaiting a response`);
  }

  booking.status = 'confirmed';
  booking.vendorRespondedAt = new Date();
  booking.vendorResponseNote = note || null;
  pushTimeline(booking, 'confirmed', note || 'Accepted by partner', 'vendor', actor);
  await booking.save();

  // Silence the ring on their other tabs and devices.
  resolveVendorAlert(vendorUserId, 'booking_request', booking._id);

  await notify(booking.userId, {
    title: 'Booking confirmed',
    body: `The partner has accepted your ${booking.type || 'booking'}.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: booking.type || '' },
  }).catch(() => {});

  return booking;
}

/**
 * Partner declines. The customer is refunded in full, always — they are being
 * turned away through no fault of their own — and capacity goes back so the
 * slot can be sold again.
 */
export async function vendorRejectBooking(vendorUserId, bookingId, { reason = '', actor = null } = {}) {
  const booking = await loadVendorBooking(vendorUserId, bookingId);
  if (booking.status !== 'awaiting_vendor') {
    throw ApiError.badRequest(`Booking is ${booking.status} and is not awaiting a response`);
  }
  if (!reason.trim()) throw ApiError.badRequest('A reason is required when declining a booking');

  await releaseCapacity(booking);

  resolveVendorAlert(vendorUserId, 'booking_request', booking._id);

  booking.status = 'rejected';
  booking.vendorRespondedAt = new Date();
  booking.vendorResponseNote = reason;
  booking.cancelledBy = 'vendor';
  booking.cancellationReason = reason;
  booking.cancelledAt = new Date();
  pushTimeline(booking, 'rejected', reason, 'vendor', actor);
  await booking.save();

  await refundBooking(booking, {
    reason: `Declined by partner: ${reason}`,
    initiatedBy: 'vendor',
    actor,
  });

  await notify(booking.userId, {
    title: 'Booking declined',
    body: `The partner could not take your ${booking.type || 'booking'}. A full refund is on its way.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: booking.type || '' },
  }).catch(() => {});

  /*
   * Declining is scored lightly — a partner who is genuinely full should say so
   * rather than accept work they cannot do. It is the PATTERN that matters, and
   * the rolling window is what catches a partner declining everything while
   * still appearing available to customers.
   */
  await recordViolation({
    vendorId: vendorUserId,
    vendorType: (await resolveBookingVendor(booking)).vendorType,
    type: 'vendor_rejected_booking',
    refType: 'booking',
    refId: booking._id,
    refLabel: `Booking ${booking.bookingNo}`,
    reason: 'Declined a booking request',
    detail: reason,
    customerImpact: 'Customer had to be refunded and find another partner.',
    source: 'auto',
    actor,
  });

  return booking;
}

/**
 * Bookings the partner never answered.
 *
 * The client's "vendor doesn't respond" case had no representation at all:
 * a request simply sat there. These surface in Admin's action queue so an
 * operator can reassign or refund before the customer turns up to nothing.
 */
export async function listUnansweredBookings({ limit = 100 } = {}) {
  return Booking.find({
    status: 'awaiting_vendor',
    vendorRespondBy: { $ne: null, $lt: new Date() },
  })
    .populate('userId', 'name phone')
    .sort({ vendorRespondBy: 1 })
    .limit(limit);
}

/**
 * Auto-decline requests the partner let expire, refunding the customer.
 *
 * Run from a scheduler. Without it an unanswered booking holds the customer's
 * money indefinitely while holding capacity nobody will service.
 */
export async function expireUnansweredBookings() {
  const stale = await listUnansweredBookings({ limit: 200 });
  const results = [];
  for (const booking of stale) {
    try {
      await releaseCapacity(booking);
      booking.status = 'rejected';
      booking.cancelledBy = 'system';
      booking.cancellationReason = 'Partner did not respond in time';
      const expiredOwner = await resolveBookingVendorId(booking);
      if (expiredOwner) resolveVendorAlert(expiredOwner, 'booking_request', booking._id);
      booking.cancelledAt = new Date();
      pushTimeline(booking, 'rejected', 'Auto-declined - partner did not respond in time', 'system');
      await booking.save();
      await refundBooking(booking, {
        reason: 'Partner did not respond in time',
        initiatedBy: 'system',
      });
      await notify(booking.userId, {
        title: 'Booking could not be confirmed',
        body: 'The partner did not respond in time. Your payment is being refunded in full.',
        type: 'booking',
        link: '/app/profile/bookings',
        data: { bookingId: String(booking._id) },
      }).catch(() => {});
      results.push({ bookingNo: booking.bookingNo, ok: true });
    } catch (err) {
      results.push({ bookingNo: booking.bookingNo, ok: false, error: err.message });
    }
  }
  return results;
}

/** Load a booking and assert this partner account actually earns it. */
async function loadVendorBooking(vendorUserId, bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw ApiError.notFound('Booking not found');
  const { vendorId } = await resolveBookingVendor(booking);
  if (!vendorId || String(vendorId) !== String(vendorUserId)) {
    throw ApiError.forbidden('This booking belongs to another partner');
  }
  return booking;
}

/* ── Disputes ────────────────────────────────────────────────────── */

/**
 * Customer contests a completed service, or a partner contests a chargeback.
 *
 * A dispute freezes nothing automatically — Admin rules on it — but it moves
 * the booking into a state that the payout screen can exclude, so the platform
 * is not settling money it may have to hand back.
 */
export async function raiseDispute(booking, { raisedBy, reason, actor = null }) {
  if (!canTransition(booking.status, 'disputed')) {
    throw ApiError.badRequest(`A ${booking.status} booking cannot be disputed`);
  }
  if (!reason?.trim()) throw ApiError.badRequest('A reason is required to raise a dispute');

  booking.status = 'disputed';
  booking.dispute = { raisedBy, reason: reason.trim(), raisedAt: new Date(), resolvedAt: null, resolution: null };
  pushTimeline(booking, 'disputed', `Dispute raised by ${raisedBy}: ${reason.trim()}`, raisedBy, actor);
  await booking.save();
  return booking;
}

/**
 * The one cancellation path.
 *
 * Ordering matters and was wrong before: capacity was released, then the
 * gateway was called, and a refund failure threw — leaving the slot given away
 * while the booking still read `confirmed`. Now the booking is closed and the
 * slot released first (the customer IS cancelling, regardless of what the
 * gateway does), and the refund is a recorded, retryable step that cannot
 * unwind the cancellation.
 */
export async function performCancellation(
  booking,
  { by = 'customer', actor = null, reason = '', refund = true, refundAmountPaise = null, force = false } = {}
) {
  // Policy window: doctor bookings follow the vet's own free-cancellation
  // rule. Cancelling inside it still releases the slot but forfeits the refund.
  let refundable = refund;
  let policyNote = '';
  if (refundable && by === 'customer' && booking.type === 'doctor' && booking.doctorId && booking.schedule?.startAt) {
    const doctor = await Doctor.findById(booking.doctorId).select('policies name');
    const hours = doctor?.policies?.cancellationHours ?? 4;
    const hoursToStart = (new Date(booking.schedule.startAt) - Date.now()) / 3_600_000;
    if (hoursToStart < hours) {
      refundable = false;
      policyNote = `Cancelled inside the ${hours}h free-cancellation window - not refundable`;
    }
  }

  /*
   * A partner cancelling or Admin cancelling on their behalf ALWAYS refunds in
   * full. The customer did nothing wrong and must never absorb a cancellation
   * fee for a failure on the supply side.
   */
  if (by === 'vendor') {
    refundable = true;
    refundAmountPaise = null;
  }

  await releaseCapacity(booking);

  booking.status = 'cancelled';
  booking.cancelledBy = by;
  booking.cancellationReason = reason || policyNote || `Cancelled by ${by}`;
  booking.cancelledAt = new Date();
  pushTimeline(booking, 'cancelled', booking.cancellationReason, by, actor);
  if (policyNote) pushTimeline(booking, 'cancelled', policyNote, 'system');
  await booking.save();

  if (refundable && booking.paymentMethod === 'razorpay' && booking.paymentId) {
    await refundBooking(booking, {
      amountPaise: refundAmountPaise,
      reason: reason || policyNote || `Booking cancelled by ${by}`,
      initiatedBy: by === 'customer' ? 'customer' : by,
      actor,
    });
  }

  await notifyBookingCancelled(booking, by);

  /*
   * A partner cancelling confirmed work is a service failure, and is scored as
   * one. Last-minute cancellations are weighted harder because the customer has
   * usually already rearranged their day around it and has no time to rebook.
   *
   * Scored after the refund, never before — compliance bookkeeping must not be
   * able to stop a customer getting their money back.
   */
  if (by === 'vendor') await scoreVendorCancellation(booking, reason, actor);

  return booking;
}

/** Record the compliance cost of a partner-side cancellation. */
async function scoreVendorCancellation(booking, reason, actor) {
  const { vendorId, vendorType } = await resolveBookingVendor(booking);
  if (!vendorId) return;

  const policy = await getPolicy().catch(() => null);
  const lastMinuteHours = policy?.sla?.lastMinuteCancelHours ?? 24;
  const startsAt = booking.schedule?.startAt
    ? new Date(booking.schedule.startAt)
    : booking.schedule?.startDate
      ? new Date(`${booking.schedule.startDate}T00:00:00Z`)
      : null;
  const hoursToStart = startsAt ? (startsAt - Date.now()) / 3_600_000 : null;
  const isLastMinute = hoursToStart !== null && hoursToStart < lastMinuteHours && hoursToStart > -24;

  await recordViolation({
    vendorId,
    vendorType,
    type: isLastMinute ? 'vendor_cancelled_late' : 'vendor_cancelled_booking',
    refType: 'booking',
    refId: booking._id,
    refLabel: `Booking ${booking.bookingNo}`,
    reason: isLastMinute
      ? `Cancelled a confirmed booking less than ${lastMinuteHours}h before the service`
      : 'Cancelled a confirmed booking',
    detail: reason || '',
    customerImpact: isLastMinute
      ? 'Customer lost their slot at short notice with no time to rebook.'
      : 'Customer lost their booking and had to be refunded.',
    source: actor ? 'admin' : 'auto',
    actor,
  });
}

/**
 * Push money back for a booking and keep the booking's own refund columns in
 * step with the Refund register. Safe to call on a booking with nothing to
 * refund — it simply does nothing.
 */
export async function refundBooking(booking, { amountPaise = null, reason, initiatedBy = 'system', actor = null }) {
  if (!booking.paymentId) return null;
  const payment = await Payment.findById(booking.paymentId);
  if (!payment || (payment.status !== 'paid' && payment.status !== 'partially_refunded')) return null;

  const refund = await issueRefund({
    payment,
    amountPaise,
    reason,
    initiatedBy,
    actor,
    refType: 'booking',
    refId: booking._id,
    label: `Booking ${booking.bookingNo}`,
  });

  if (refund.status === 'processed') {
    const totalRefunded = (booking.refundedAmount || 0) + refund.amount;
    booking.refundedAmount = totalRefunded;
    booking.refundStatus = totalRefunded >= (booking.amounts?.total || 0) ? 'full' : 'partial';
    pushTimeline(
      booking,
      'refunded',
      `Refund ${refund.refundNo} of ${Math.round(refund.amount / 100).toLocaleString('en-IN')} initiated to source`,
      initiatedBy,
      actor
    );
  } else {
    booking.refundStatus = 'failed';
    pushTimeline(
      booking,
      booking.status,
      `Refund ${refund.refundNo} FAILED: ${refund.failureReason || 'gateway error'} - queued for Admin retry`,
      'system'
    );
  }
  await booking.save();
  return refund;
}

/** Append a timeline entry that records who caused it, not just what changed. */
export function pushTimeline(booking, status, note, by = 'system', actor = null) {
  booking.timeline.push({
    status,
    at: new Date(),
    note: note || '',
    by,
    byId: actor?.id || actor?._id || null,
    byName: actor?.name || actor?.email || '',
  });
}

async function notifyBookingCancelled(booking, by) {
  const label = booking.type || 'booking';
  await notify(booking.userId, {
    title: by === 'vendor' ? 'Booking cancelled by partner' : 'Booking cancelled',
    body:
      by === 'vendor'
        ? `Your ${label} booking was cancelled by the partner. A full refund is on its way.`
        : `Your ${label} booking has been cancelled.`,
    type: 'booking',
    link: '/app/profile/bookings',
    data: { bookingId: String(booking._id), type: label },
  }).catch(() => {});

  const vendorId = await resolveBookingVendorId(booking);
  if (vendorId && by !== 'vendor') {
    await notify(vendorId, {
      title: 'Booking cancelled',
      body: `Booking ${booking.bookingNo} was cancelled by the ${by}.`,
      type: 'booking',
      link: '/vendor/bookings',
      data: { bookingId: String(booking._id) },
    }).catch(() => {});
  }
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
