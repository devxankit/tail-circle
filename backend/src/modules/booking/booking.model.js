import mongoose from 'mongoose';

export const BOOKING_TYPES = ['daycare', 'grooming', 'doctor', 'event', 'memorial'];

export const BOOKING_STATUSES = [
  'pending_payment',
  'confirmed',
  'in_progress',
  'completed',
  // Video consult ran past its booked duration with the owner's consent; the
  // overage invoice is outstanding. The digital prescription is held until paid.
  'pending_overage',
  'cancelled',
  'no_show',
  'refunded',
];

export const CANCELLABLE_BOOKING_STATUSES = ['pending_payment', 'confirmed'];

/**
 * One booking model for all five verticals. Priced items are snapshots
 * validated against ServiceOffering/Doctor/Event at creation; `amounts` are
 * integer paise. Type-specific answers (daycare pet questionnaire, grooming
 * visit address, memorial contact form…) live under `meta`.
 */
const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, unique: true },
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
    timeline: [
      {
        _id: false,
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
        note: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ providerId: 1, 'schedule.startDate': 1 });

bookingSchema.pre('save', function assignBookingNo() {
  if (!this.bookingNo) {
    this.bookingNo = `TCG${Math.floor(10000000 + Math.random() * 90000000)}`;
  }
});

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
