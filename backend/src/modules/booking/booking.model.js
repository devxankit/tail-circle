import mongoose from 'mongoose';
import { randomBytes, randomInt } from 'node:crypto';

export const BOOKING_TYPES = ['daycare', 'grooming', 'doctor', 'event', 'memorial'];

export const BOOKING_STATUSES = [
  'pending_payment',
  // Paid (or pay-later) and waiting on the partner to accept. Only used by
  // verticals whose ServiceOffering opts into manual acceptance; everything
  // else still goes straight to `confirmed`.
  'awaiting_vendor',
  'confirmed',
  // Partner declined. Terminal, and always paired with a refund when money was
  // taken — the customer never keeps a rejected booking's charge.
  'rejected',
  'in_progress',
  'completed',
  // Video consult ran past its booked duration with the owner's consent; the
  // overage invoice is outstanding. The digital prescription is held until paid.
  'pending_overage',
  'cancelled',
  'no_show',
  'refunded',
  // Service delivered but contested by the customer. Freezes vendor settlement
  // until Admin rules on it.
  'disputed',
  // Checkout failed at the gateway. Distinct from `pending_payment` so Admin
  // can separate "never tried" from "tried and failed" in the funnel.
  'payment_failed',
];

/*
 * Who ended the booking. `status: 'cancelled'` alone could not distinguish a
 * customer changing their mind from a partner dropping out — which is the
 * difference between a cancellation fee and a vendor penalty, and the single
 * most important number in judging partner reliability.
 */
export const CANCELLED_BY = ['customer', 'vendor', 'admin', 'system'];

/*
 * How much of the customer's money has gone back.
 *
 * Deliberately NOT folded into `status`: a booking can be both `cancelled` and
 * partially refunded, and overloading one field forced the old code to choose
 * which fact to keep. Admin needs both columns to reconcile.
 */
export const REFUND_STATES = ['none', 'pending', 'partial', 'full', 'failed'];

export const CANCELLABLE_BOOKING_STATUSES = ['pending_payment', 'awaiting_vendor', 'confirmed'];

/** States that still owe the customer a service — used by ops dashboards. */
export const OPEN_BOOKING_STATUSES = [
  'pending_payment',
  'awaiting_vendor',
  'confirmed',
  'in_progress',
  'pending_overage',
];

/** Terminal states: nothing further happens without an Admin override. */
export const TERMINAL_BOOKING_STATUSES = [
  'completed',
  'cancelled',
  'rejected',
  'no_show',
  'refunded',
  'payment_failed',
];

/**
 * Legal moves through the lifecycle.
 *
 * Kept as data rather than scattered `if` checks so that the customer app, the
 * partner panel and Admin all validate against ONE definition. Before this,
 * each surface enforced its own rules and a booking could reach a state the
 * other two had no handling for.
 *
 * Admin can override outside these edges, but only through the explicitly
 * audited override path — never silently.
 */
export const BOOKING_TRANSITIONS = {
  pending_payment: ['awaiting_vendor', 'confirmed', 'cancelled', 'payment_failed'],
  payment_failed: ['pending_payment', 'cancelled'],
  awaiting_vendor: ['confirmed', 'rejected', 'cancelled', 'no_show'],
  confirmed: ['in_progress', 'completed', 'cancelled', 'no_show'],
  in_progress: ['completed', 'pending_overage', 'disputed', 'cancelled'],
  pending_overage: ['completed', 'disputed'],
  completed: ['disputed', 'refunded'],
  disputed: ['completed', 'refunded', 'cancelled'],
  cancelled: ['refunded'],
  rejected: ['refunded'],
  no_show: ['refunded', 'disputed'],
  refunded: [],
};

/** Whether `next` is reachable from `current` without an Admin override. */
export function canTransition(current, next) {
  if (current === next) return true;
  return (BOOKING_TRANSITIONS[current] || []).includes(next);
}

/**
 * One booking model for all five verticals. Priced items are snapshots
 * validated against ServiceOffering/Doctor/Event at creation; `amounts` are
 * integer paise. Type-specific answers (daycare pet questionnaire, grooming
 * visit address, memorial contact form…) live under `meta`.
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, unique: true },
    /*
     * What the ticket QR encodes.
     *
     * Deliberately not `bookingNo`: that is printed on the ticket in plain
     * text, is only eight digits, and is quoted in support threads and
     * receipts — anything that can read it could mint a matching QR. This is
     * random, high-entropy and never displayed, so presenting the code is
     * itself evidence of holding the ticket.
     */
    ticketToken: { type: String, default: null, index: true, sparse: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: BOOKING_TYPES, required: true, index: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
    petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', default: null },
    petSnapshot: { type: Object, default: null }, // name/breed/image as displayed

    schedule: {
      startDate: { type: String, default: null }, // YYYY-MM-DD
      endDate: { type: String, default: null },
      time: { type: String, default: null },      // display label, e.g. "06:00 PM"
      durationDays: { type: Number, default: null },
      // Exact UTC instant the slot begins, resolved from the vet's timezone at
      // booking time. Everything that needs real chronology — the video-call
      // join window, reminders, no-show detection — reads this, never `time`.
      startAt: { type: Date, default: null },
    },
    visitType: { type: String, default: null }, // salon|home|clinic|video|emergency

    // Doctor bookings only: the consult mode as configured on the vet profile,
    // the booked length (the overage meter's baseline), and whether this was
    // priced as a follow-up.
    consult: {
      mode: { type: String, default: null },     // inClinic|video|homeVisit|emergency
      durationMinutes: { type: Number, default: null },
      isFollowUp: { type: Boolean, default: false },
    },

    items: [
      {
        _id: false,
        kind: { type: String, required: true }, // plan|package|addon|menu_item|consultation|ticket
        refId: { type: String, default: null }, // offering legacyId / doctor / event
        name: { type: String, required: true },
        price: { type: Number, required: true }, // rupees
        qty: { type: Number, default: 1 },
      },
    ],
    amounts: {
      base: { type: Number, required: true }, // paise
      addons: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },
    addressSnapshot: { type: Object, default: null }, // home-visit grooming
    meta: { type: Object, default: {} }, // questionnaire answers, contact form, ticketQty…

    paymentMethod: { type: String, enum: ['razorpay', 'pay_later', 'free'], required: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending_payment',
      index: true,
    },

    /* ── Who ended it, and what happened to the money ──────────────── */
    cancelledBy: { type: String, enum: CANCELLED_BY, default: null },
    cancellationReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
    /*
     * Refund state carried alongside `status` rather than inside it, so a
     * cancelled-and-refunded booking reports both facts. `refundedAmount` is
     * the paise actually returned; the authoritative per-attempt history lives
     * in the Refund collection.
     */
    refundStatus: { type: String, enum: REFUND_STATES, default: 'none', index: true },
    refundedAmount: { type: Number, default: 0 }, // paise

    /* ── Partner acceptance (verticals that require it) ─────────────── */
    vendorRespondedAt: { type: Date, default: null },
    vendorResponseNote: { type: String, default: null },
    /*
     * When the partner's acceptance window closes. A booking still in
     * `awaiting_vendor` past this is an unanswered request — the "vendor
     * doesn't respond" case — and is swept into Admin's action queue.
     */
    vendorRespondBy: { type: Date, default: null },

    /* ── Dispute ────────────────────────────────────────────────────── */
    dispute: {
      raisedBy: { type: String, enum: ['customer', 'vendor', null], default: null },
      reason: { type: String, default: null },
      raisedAt: { type: Date, default: null },
      resolvedAt: { type: Date, default: null },
      resolution: { type: String, default: null },
    },

    timeline: [
      {
        _id: false,
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
        /*
         * Which surface caused the change. Without it a timeline read like a
         * list of things that happened to nobody in particular — Admin could
         * not answer "who cancelled this?" from the record.
         */
        by: { type: String, default: 'system' }, // customer | vendor | admin | system
        byId: { type: mongoose.Schema.Types.ObjectId, default: null },
        byName: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, 'schedule.startDate': 1 });
/* Admin ops lists filter by status and date, and sort by recency. */
bookingSchema.index({ status: 1, createdAt: -1 });
bookingSchema.index({ type: 1, status: 1, createdAt: -1 });
/* Sweeping unanswered partner requests. */
bookingSchema.index({ status: 1, vendorRespondBy: 1 });

bookingSchema.pre('save', function assignBookingNo() {
  if (this.type === 'event' && !this.ticketToken) {
    // 32 hex chars from the CSPRNG. `Math.random` is fine for a display
    // reference like bookingNo but must not back a credential.
    this.ticketToken = randomBytes(16).toString('hex');
  }
  if (!this.bookingNo) {
    /*
     * Eight digits from the CSPRNG rather than `Math.random`.
     *
     * The field is uniquely indexed with no retry around it, so a collision
     * did not degrade gracefully — it threw E11000 and lost the customer's
     * booking outright. `Math.random` made that likelier than it looked:
     * V8 seeds it per-process, so two workers starting together can walk
     * correlated sequences. This draws from the same entropy pool as
     * `ticketToken`, and `createWithUniqueRef` retries on the rare clash.
     */
    this.bookingNo = `TCG${randomInt(10000000, 100000000)}`;
  }
});

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
