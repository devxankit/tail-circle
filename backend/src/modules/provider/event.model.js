import mongoose from 'mongoose';

/**
 * Ticketed pet events. Display fields mirror the mock cards verbatim;
 * `capacity`/`sold` drive real ticket availability.
 */
const eventSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, unique: true, sparse: true },
    organizerProviderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', default: null },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true }, // events vendor owner
    title: { type: String, trim: true, required: true },
    emoji: { type: String, default: '' },
    img: { type: String, default: '' },
    dateDay: { type: String, default: '' }, // '25'
    monthText: { type: String, default: '' }, // 'MAY'
    timeText: { type: String, default: '' }, // '4:00 PM - 7:00 PM'
    location: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 }, // rupees per ticket
    category: { type: String, default: '', index: true },
    going: { type: Number, default: 0 },
    desc: { type: String, default: '' },
    avatars: { type: [String], default: [] },
    startAt: { type: Date, default: null },
    capacity: { type: Number, default: 100 },
    sold: { type: Number, default: 0 },

    /*
     * Handler / trainer support offered at the event.
     *
     * The platform does not run trainers, roster them, or hold places for
     * them. This is only the organiser's declaration of what they provide and
     * what they charge: an owner opts in at checkout, the money goes to the
     * organiser with the ticket, and the organiser is told the booking
     * includes a handler. Delivering that handler on the day is entirely
     * theirs.
     *
     * `provision` is a tri-state rather than a boolean plus a price, because
     * "included at no extra cost" and "not offered at all" are different
     * answers that a price of 0 cannot tell apart.
     */
    trainer: {
      provision: { type: String, enum: ['none', 'included', 'paid'], default: 'none' },
      pricePerPet: { type: Number, default: 0, min: 0 }, // rupees, only read when 'paid'
      note: { type: String, default: '' }, // what the organiser's handler does
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'completed', 'cancelled'],
      default: 'published',
      index: true,
    },
  },
  { timestamps: true }
);

export const Event = mongoose.model('Event', eventSchema);

/** Category chips + custom-event package templates (EventList side rails). */
const eventMetaSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['category', 'package_template'], required: true, index: true },
    legacyId: { type: String, required: true },
    data: { type: Object, required: true }, // verbatim mock object
    sort: { type: Number, default: 0 },
  },
  { timestamps: true }
);
eventMetaSchema.index({ kind: 1, legacyId: 1 }, { unique: true });

export const EventMeta = mongoose.model('EventMeta', eventMetaSchema);
