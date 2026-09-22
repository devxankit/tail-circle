import mongoose from 'mongoose';

/**
 * Customer activity tracking.
 *
 * The platform previously recorded nothing about what customers DO — only
 * `lastSeenAt` and whether a socket was open. So "what are people looking for,
 * where do they spend their time, and where do they drop off?" had no answer at
 * all, and every conversion question was guesswork.
 *
 * Three collections:
 *   ConsentRecord  — the legal basis. Nothing below is written without one.
 *   UserSession    — one visit: when it started, how long, how it ended.
 *   ActivityEvent  — what happened inside that visit.
 *
 * NOTHING here is written unless the visitor has actively granted consent.
 * Declining means no rows at all, not anonymous rows — see analytics.service.js.
 */

/* ── Consent ──────────────────────────────────────────────────────── */

export const CONSENT_CATEGORIES = ['essential', 'analytics'];

/**
 * A visitor's cookie decision.
 *
 * Keyed on `deviceId` — a random id the browser keeps — because the decision is
 * made before anyone logs in, and has to be honoured for guests too. `userId`
 * is attached later if they sign in, so an operator can answer "did this
 * customer consent?" without needing the device in front of them.
 *
 * Every decision is kept rather than overwritten: consent has to be
 * demonstrable, including when somebody granted it and later withdrew it.
 */
const consentSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    /** True only when the visitor actively accepted. Declining stores `false`. */
    analytics: { type: Boolean, required: true },
    /** Essential cookies (session, cart) are not optional and are always true. */
    essential: { type: Boolean, default: true },

    /**
     * Which version of the cookie policy they agreed to. Bumping this in
     * config re-prompts everybody, which is what a material policy change
     * legally requires.
     */
    policyVersion: { type: String, default: 'v1' },
    /** 'banner' | 'settings' | 'withdrawn' — how the decision was made. */
    source: { type: String, default: 'banner' },

    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    decidedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

consentSchema.index({ deviceId: 1, decidedAt: -1 });

export const ConsentRecord = mongoose.model('ConsentRecord', consentSchema);

/* ── Session ──────────────────────────────────────────────────────── */

const sessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    startedAt: { type: Date, default: Date.now, index: true },
    lastSeenAt: { type: Date, default: Date.now },
    /** Rolled up from lastSeenAt - startedAt when the session is closed out. */
    durationMs: { type: Number, default: 0 },

    eventCount: { type: Number, default: 0 },
    screenCount: { type: Number, default: 0 },
    searchCount: { type: Number, default: 0 },

    entryPath: { type: String, default: '' },
    exitPath: { type: String, default: '' },

    /**
     * Did this visit end in a purchase?
     *
     * Denormalised onto the session so the browse-to-booking funnel is a single
     * group-by rather than a join against bookings for every session.
     */
    converted: { type: Boolean, default: false, index: true },
    conversionType: { type: String, default: null }, // booking | order

    city: { type: String, default: '' },
    platform: { type: String, default: 'web' },
    referrer: { type: String, default: '' },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, startedAt: -1 });
sessionSchema.index({ startedAt: -1 });

export const UserSession = mongoose.model('UserSession', sessionSchema);

/* ── Events ───────────────────────────────────────────────────────── */

/**
 * What a customer did. Deliberately a fixed vocabulary rather than free text,
 * so the reports can group on it and mean something.
 */
export const EVENT_TYPES = [
  'screen_view',   // opened a screen, with time spent
  'search',        // typed a search query
  'item_view',     // opened a provider / product / service / doctor / event
  'add_to_cart',
  'checkout_start',
  'booking',       // completed a booking
  'order',         // completed an order
  'abandon',       // left a checkout without completing
];

export const ITEM_REF_TYPES = [
  'provider', 'product', 'doctor', 'event', 'meal_plan', 'service', 'category', 'other',
];

const eventSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    deviceId: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    type: { type: String, enum: EVENT_TYPES, required: true, index: true },

    /** Route path, e.g. /app/grooming. Query string is stripped before storing. */
    path: { type: String, default: '' },
    /** Friendly label the UI supplies, e.g. "Grooming". */
    screen: { type: String, default: '' },

    /** How long they stayed on the screen. Only set on `screen_view`. */
    durationMs: { type: Number, default: 0 },

    /** The search text, lower-cased and trimmed. Only set on `search`. */
    query: { type: String, default: '' },
    resultCount: { type: Number, default: null },

    /** What they looked at. Only set on `item_view` and cart/booking events. */
    refType: { type: String, enum: ITEM_REF_TYPES, default: null },
    refId: { type: String, default: null },
    refName: { type: String, default: '' },
    category: { type: String, default: '', index: true },

    city: { type: String, default: '', index: true },
    platform: { type: String, default: 'web' },

    /** Anything vertical-specific. Never trusted for business logic. */
    meta: { type: Object, default: {} },

    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

/* Per-customer journey: every event for one person, newest first. */
eventSchema.index({ userId: 1, occurredAt: -1 });
/* Session replay: everything that happened in one visit, in order. */
eventSchema.index({ sessionId: 1, occurredAt: 1 });
/* "Most viewed" and "most searched" reports. */
eventSchema.index({ type: 1, occurredAt: -1 });
eventSchema.index({ type: 1, refType: 1, refId: 1 });
/*
 * Retention is currently INDEFINITE by product decision, so this index exists
 * to keep date-ranged reports fast as the collection grows. If a retention
 * policy is introduced later, a TTL index on `occurredAt` is the one-line
 * change — nothing else needs to move.
 */
eventSchema.index({ occurredAt: -1 });

export const ActivityEvent = mongoose.model('ActivityEvent', eventSchema);
