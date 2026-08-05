import mongoose from 'mongoose';

/**
 * One video consultation session, bound 1:1 to a `type: 'doctor'` Booking with
 * `visitType: 'video'`.
 *
 * Media is direct browser-to-browser WebRTC (P2P) — every consult is exactly
 * one vet and one pet parent, so there's never a reason to route it through a
 * media server. `roomName` is the Socket.IO room the two browsers use to
 * exchange their offer/answer/ICE candidates (`sockets/index.js`).
 *
 * Billing note: `participants[].joinedAt/leftAt` are written **only** from the
 * server-side socket join/leave handlers (`consult.service.js::markParticipantJoined/Left`),
 * never from a client-reported timestamp. Billable time is the window during
 * which both the vet and the pet parent were connected simultaneously — a
 * client-side timer is display only and is never trusted for money.
 */

export const CALL_STATUSES = [
  'scheduled',  // room not yet created
  'ringing',    // vet started; parent notified, not yet joined
  'active',     // both parties connected
  'ended',      // completed normally
  'missed',     // parent never answered
  'rejected',   // parent declined
  'cancelled',  // vet cancelled while ringing
];

const participantSchema = new mongoose.Schema(
  {
    _id: false,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['vet', 'patient'], required: true },
    identity: { type: String, default: '' }, // unused, kept for backward compatibility
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    // Cumulative connected seconds across reconnects (mobile networks drop).
    connectedSeconds: { type: Number, default: 0 },
  },
  { _id: false }
);

const consultCallSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    // The vet's own login, and the clinic tenant — either may be the caller.
    doctorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    clinicVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    roomName: { type: String, required: true, unique: true },

    status: { type: String, enum: CALL_STATUSES, default: 'scheduled', index: true },

    /** Booked consult length — the baseline the overage meter measures against. */
    scheduledMinutes: { type: Number, required: true },

    startedAt: { type: Date, default: null },  // both parties first connected
    endedAt: { type: Date, default: null },
    ringingAt: { type: Date, default: null },

    /** Seconds both parties were connected together. Webhook-derived. */
    billedSeconds: { type: Number, default: 0 },

    participants: { type: [participantSchema], default: [] },

    /**
     * Overage: charged only after the pet parent explicitly consents mid-call.
     * No consent ⇒ `consentAt` stays null ⇒ nothing is billable, and the call is
     * cut at the grace boundary.
     */
    overage: {
      ratePerMinute: { type: Number, default: 0 },     // rupees, snapshot at start
      graceMinutes: { type: Number, default: 2 },
      maxMinutes: { type: Number, default: 30 },
      consentAt: { type: Date, default: null },        // when the parent agreed
      warnedAt: { type: Date, default: null },
      minutes: { type: Number, default: 0 },           // settled billable minutes
      amount: { type: Number, default: 0 },            // rupees
      waived: { type: Boolean, default: false },       // vet forgave the overage
      status: {
        type: String,
        enum: ['none', 'pending', 'paid', 'waived'],
        default: 'none',
      },
      paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    },

    /** Free-text notes the vet took during the call (mirrored to MedicalRecord). */
    notes: { type: String, default: '' },

    events: [
      {
        _id: false,
        type: { type: String, required: true },
        at: { type: Date, default: Date.now },
        detail: { type: String, default: '' },
      },
    ],
  },
  { timestamps: true }
);

consultCallSchema.index({ ownerUserId: 1, status: 1 });
consultCallSchema.index({ doctorId: 1, createdAt: -1 });

/**
 * The participant entry for a user, creating it on first sight.
 *
 * Deliberately does not touch `joinedAt`/`leftAt` here — this runs on the
 * REST start/join call, before media has actually connected. Those fields
 * are written only once the client's socket actually joins the call's
 * signalling room (see the billing note above); setting them here would mark
 * someone "connected" the moment they call this REST endpoint, even if their
 * browser never joins the room, which both flips `bothConnected()` early and
 * inflates billed seconds.
 */
consultCallSchema.methods.participantFor = function participantFor(userId, role) {
  let p = this.participants.find((x) => String(x.userId) === String(userId));
  if (!p) {
    this.participants.push({ userId, role, identity: String(userId) });
    p = this.participants[this.participants.length - 1];
  }
  return p;
};

/** Is someone of this role currently connected (joined and not left)? */
consultCallSchema.methods.isConnected = function isConnected(role) {
  return this.participants.some((p) => p.role === role && p.joinedAt && !p.leftAt);
};

/** Both sides connected right now — the condition for billable time to accrue. */
consultCallSchema.methods.bothConnected = function bothConnected() {
  return this.isConnected('vet') && this.isConnected('patient');
};

export const ConsultCall = mongoose.model('ConsultCall', consultCallSchema);
export default ConsultCall;
