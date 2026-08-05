import mongoose from 'mongoose';

/**
 * Capacity counter per (provider, date, time). Created lazily on first
 * booking of a slot; availability = template times minus full counters.
 * The atomic `$inc` with a capacity guard makes double-booking impossible.
 */
const slotBookingSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      required: true,
    },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', default: null },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // display time from the template
    capacity: { type: Number, required: true, min: 1 },
    booked: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

slotBookingSchema.index({ providerId: 1, doctorId: 1, date: 1, time: 1 }, { unique: true });

export const SlotBooking = mongoose.model('SlotBooking', slotBookingSchema);
export default SlotBooking;
